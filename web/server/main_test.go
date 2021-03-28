package main

import (
	"errors"
	"fmt"
	"io/ioutil"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"testing"
	"time"

	"github.com/hashicorp/go-retryablehttp"
)

func Test_getEnvVar(t *testing.T) {
	const key = "TESTING_ENV_VAR"
	tests := []struct {
		name    string
		envVal  string
		wantVal string
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
			gotVal, err := evg.getEnvVar(key)
			if (err != nil) != tt.wantErr {
				t.Fatalf("getEnvVar() error = %v, wantErr %v", err, tt.wantErr)
			}
			if gotVal != tt.wantVal {
				t.Fatalf("getEnvVar() = %v, want %v", gotVal, tt.wantVal)
			}
		})
	}
}

type envVarGetterMock struct {
	retVals []string
}

func (evg *envVarGetterMock) getEnvVar(key string) (val string, err error) {
	var retVal string
	retVal, evg.retVals = evg.retVals[0], evg.retVals[1:]
	if retVal == "" {
		return "", errors.New("")
	} else {
		return retVal, nil
	}
}

func Test_getFrontendConfig(t *testing.T) {
	tests := []struct {
		name        string
		mockRetVals []string
		want        map[string]string
		wantErr     bool
	}{
		{
			"Error getting Centrifugo secret", []string{""}, nil, true,
		},
		{
			"Bad Centrifugo secret UUID format", []string{"42"}, nil, true,
		},
		{
			"Bad Centrifugo secret UUID version",
			[]string{"00000000-0000-0000-0000-000000000000"},
			nil,
			true,
		},
		{
			"Error getting InfluxDB DB name",
			[]string{"ba7e8d26-ea52-47dc-bf76-40a4f9d41eb8", ""},
			nil,
			true,
		},
		{
			"Success",
			[]string{"ba7e8d26-ea52-47dc-bf76-40a4f9d41eb8", "db"},
			map[string]string{
				"centrifugo_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.VMyWo-77A4z9hZrBGQWglCNOwjOpKYmlboEzzVa7_do",
				"influx_db_name":   "db",
			},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			evg = &envVarGetterMock{tt.mockRetVals}
			got, err := fcg.getFrontendConfig()
			if (err != nil) != tt.wantErr {
				t.Fatalf("getFrontendConfig() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("getFrontendConfig() = %v, want %v", got, tt.want)
			}
		})
	}
}

var cookiesFixture = map[string]string{
	"cookie_1": "value_1",
	"cookie_2": "value_2",
}

type frontConfGetterMock struct {
	fail bool
}

func (fcg *frontConfGetterMock) getFrontendConfig() (map[string]string, error) {
	if fcg.fail {
		return nil, errors.New("")
	} else {
		return cookiesFixture, nil
	}
}

func Test_configCookiesMiddleware(t *testing.T) {
	h := cmp.configCookiesMiddleware(
		http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {}),
	)

	tests := []struct {
		name       string
		method     string
		path       string
		mockFail   bool
		expStatus  int
		expCookies bool
	}{
		{"Not GET method", http.MethodPost, "/", false, 200, false},
		{"Not root path", http.MethodGet, "/favicon.ico", false, 200, false},
		{"Error getting config", http.MethodGet, "/", true, 500, false},
		{"Success", http.MethodGet, "/", false, 200, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fcg = &frontConfGetterMock{tt.mockFail}
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
			exp := len(cookiesFixture)
			found := 0
			for k, v := range cookiesFixture {
				for _, c := range w.Result().Cookies() {
					if c.Name == k && c.Value == v {
						found++
					}
					if c.SameSite != http.SameSiteStrictMode {
						t.Fatal("expected cookies to have SameSite=Strict")
					}
				}
			}
			if tt.expCookies {
				if found != exp {
					t.Fatalf("expected %v cookies, got %v", exp, found)
				}
			} else {
				if found != 0 {
					t.Fatalf("expected no cookie, found %v", found)
				}
			}
		})
	}
}

type configMiddlewarewProviderMock struct {
	callCount uint
}

func (mwp *configMiddlewarewProviderMock) configCookiesMiddleware(next http.Handler) http.Handler {
	mwp.callCount += 1
	return next
}

func Test_main(t *testing.T) {
	if err := os.Chdir(t.TempDir()); err != nil {
		t.Fatalf("chdir to temporary directory error: %v", err)
	}

	f, err := os.Create("index.html")
	if err != nil {
		t.Fatalf("error creating index.html: %v", err)
	}
	defer f.Close()

	if _, err = f.WriteString("html content"); err != nil {
		t.Fatalf("error writing index.html content: %v", err)
	}

	hn, err := os.Hostname()
	if err != nil {
		t.Fatalf("error getting hostname: %v", err)
	}

	ip, err := net.LookupHost(hn)
	if err != nil {
		t.Fatalf("hostname lookup error: %v", err)
	}

	cmp = &configMiddlewarewProviderMock{}
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
