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

func Test_envString_getCookieValue(t *testing.T) {
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
			got, err := envString(key).getCookieValue()
			if (err != nil) != tt.wantErr {
				t.Fatalf("envString.getCookieValue() error = %v, wantErr %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Fatalf("envString.getCookieValue() = %v, want %v", got, tt.wantErr)
			}
		})
	}
}

func Test_jwtToken_getCookieValue(t *testing.T) {
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
			got, err := jwtToken(key).getCookieValue()
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

var cookiesFixture = map[string]string{
	"cookie_1": "value_1",
	"cookie_2": "value_2",
}

type successCookieValueGetter string

func (g successCookieValueGetter) getCookieValue() (string, error) {
	return string(g), nil
}

type errorCookieValueGetter string

func (g errorCookieValueGetter) getCookieValue() (string, error) {
	return "", errors.New("cookie value getter error")
}

func Test_configCookiesMiddleware(t *testing.T) {
	h := cmp.configCookiesMiddleware(
		http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {}),
	)

	tests := []struct {
		name        string
		method      string
		path        string
		cookieError bool
		expStatus   int
		expCookies  bool
	}{
		{"Not GET method", http.MethodPost, "/", false, 200, false},
		{"Not root path", http.MethodGet, "/favicon.ico", false, 200, false},
		{"Error getting cookie value", http.MethodGet, "/", true, 500, false},
		{"Success", http.MethodGet, "/", false, 200, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.cookieError {
				environmentCookies = map[string]cookieValueGetter{
					"cookie_1": successCookieValueGetter("value_1"),
					"cookie_2": errorCookieValueGetter("value_2"),
				}
			} else {
				environmentCookies = map[string]cookieValueGetter{
					"cookie_1": successCookieValueGetter("value_1"),
					"cookie_2": successCookieValueGetter("value_2"),
				}
			}
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
