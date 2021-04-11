package main

import (
	"errors"
	"fmt"
	"io/ioutil"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/hashicorp/go-retryablehttp"
)

func Test_nonEmptyEnv_fromEnv(t *testing.T) {
	const key = "TESTING_ENV_VAR"
	tests := []struct {
		name    string
		envVal  string
		want    string
		wantErr bool
	}{
		{"Missing envvar", "!UNSET!", "", true},
		{"Empty envvar", "", "", true},
		{"Non-empty envvar", "Value", "Value", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envVal == "!UNSET!" {
				os.Unsetenv(key)
			} else {
				os.Setenv(key, tt.envVal)
			}
			got, err := nonEmptyEnv(key).fromEnv()
			if (err != nil) != tt.wantErr {
				t.Fatalf("envString.getCookieValue() error = %v, wantErr %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Fatalf("envString.getCookieValue() = %v, want %v", got, tt.wantErr)
			}
		})
	}
}

func Test_jwtToken_fromEnv(t *testing.T) {
	const key = "TESTING_ENV_VAR"
	tests := []struct {
		name    string
		envVal  string
		want    string
		wantErr bool
	}{
		{
			"Empty envvar", "", "", true,
		},
		{
			"Bad UUID format", "baduuid", "", true,
		},
		{
			"Bad UUID version", "00000000-0000-0000-0000-000000000000", "", true,
		},
		{
			"Success",
			"ba7e8d26-ea52-47dc-bf76-40a4f9d41eb8",
			"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.VMyWo-77A4z9hZrBGQWglCNOwjOpKYmlboEzzVa7_do",
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Setenv(key, tt.envVal)
			got, err := jwtToken(key).fromEnv()
			if (err != nil) != tt.wantErr {
				t.Errorf("jwtToken.getCookieValue() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("jwtToken.getCookieValue() = %v, want %v", got, tt.want)
			}
		})
	}
}

func prepareIndexHtml(t *testing.T, content string) error {
	if err := os.Chdir(t.TempDir()); err != nil {
		return fmt.Errorf("chdir to temporary directory error: %v", err)
	}

	f, err := os.Create("index.html")
	if err != nil {
		return fmt.Errorf("error creating index.html: %v", err)
	}
	defer f.Close()

	if _, err = f.WriteString(content); err != nil {
		return fmt.Errorf("error writing index.html content: %v", err)
	}

	return nil
}

const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Document</title>
  <script type="application/json">
    {{.}}
  </script>
</head>
<body></body>
</html>
`

const finalHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Document</title>
  <script type="application/json">
    {"key1":"value1","key2":"value2"}
  </script>
</head>
<body></body>
</html>
`

type failingEnvGetter struct{}

func (f failingEnvGetter) fromEnv() (string, error) {
	return "", errors.New("failing env getter")
}

type successEnvGetter string

func (s successEnvGetter) fromEnv() (string, error) {
	return string(s), nil
}

func Test_configMiddleware(t *testing.T) {
	h := mp.middleware(
		http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {}),
	)

	tests := []struct {
		name           string
		method         string
		path           string
		frontendConfig map[string]envGetter
		htmlContent    string
		expStatus      int
		expIndexHtml   bool
	}{
		{
			"Not GET method",
			http.MethodPost,
			"/",
			map[string]envGetter{},
			"",
			200,
			false,
		},
		{
			"Not root path",
			http.MethodGet,
			"/favicon.ico",
			map[string]envGetter{},
			"",
			200,
			false,
		},
		{
			"Error getting environment value",
			http.MethodGet,
			"/",
			map[string]envGetter{"key1": failingEnvGetter{}},
			"",
			500,
			false,
		},
		{
			"Error parsing index.html",
			http.MethodGet,
			"/",
			map[string]envGetter{
				"key1": successEnvGetter("value1"),
				"key2": successEnvGetter("value2"),
			},
			"{{define fail}}",
			500,
			false,
		},
		{
			"Error executing the template",
			http.MethodGet,
			"/",
			map[string]envGetter{
				"key1": successEnvGetter("value1"),
				"key2": successEnvGetter("value2"),
			},
			"{{nil}}",
			500,
			false,
		},
		{
			"Success",
			http.MethodGet,
			"/",
			map[string]envGetter{
				"key1": successEnvGetter("value1"),
				"key2": successEnvGetter("value2"),
			},
			htmlTemplate,
			200,
			true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := prepareIndexHtml(t, tt.htmlContent); err != nil {
				t.Fatal(err)
			}
			frontendConfig = tt.frontendConfig
			w := httptest.NewRecorder()
			req := httptest.NewRequest(tt.method, tt.path, nil)
			h.ServeHTTP(w, req)
			if w.Result().StatusCode != tt.expStatus {
				t.Fatalf(
					"expected %v status, got %v",
					tt.expStatus,
					w.Result().StatusCode,
				)
			}
			if tt.expIndexHtml {
				b, err := ioutil.ReadAll(w.Body)
				if err != nil {
					t.Fatalf("error reading body: %v", err)
				}
				body := string(b)
				if body != finalHtml {
					t.Fatalf("expected %v, got %v", finalHtml, body)
				}
			}
		})
	}
}

type middlewarewProviderMock struct {
	callCount uint
}

func (mwp *middlewarewProviderMock) middleware(next http.Handler) http.Handler {
	mwp.callCount += 1
	return next
}

func Test_main(t *testing.T) {
	if err := prepareIndexHtml(t, "html content"); err != nil {
		t.Fatal(err)
	}

	hn, err := os.Hostname()
	if err != nil {
		t.Fatalf("error getting hostname: %v", err)
	}

	ip, err := net.LookupHost(hn)
	if err != nil {
		t.Fatalf("hostname lookup error: %v", err)
	}

	mp = &middlewarewProviderMock{}
	go main()

	rc := retryablehttp.NewClient()
	rc.RetryWaitMin = 100 * time.Millisecond
	rc.RetryWaitMax = 200 * time.Millisecond
	rc.RetryMax = 10
	resp, err := rc.Get(fmt.Sprintf("http://%v:%v", ip, bindPort))
	if err != nil {
		t.Fatalf("GET request error: %v", err)
	}

	if resp.StatusCode != 200 {
		t.Fatalf("expected status 200 OK, got %v", resp.Status)
	}

	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("error reading response body: %v", err)
	}
	if bs := string(body); bs != "html content" {
		t.Fatalf("expected `html content` body, got: %v", bs)
	}
}
