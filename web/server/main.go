package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/google/uuid"
	"github.com/gorilla/handlers"
	"gopkg.in/square/go-jose.v2"
	"gopkg.in/square/go-jose.v2/jwt"
)

const bindPort = 8080

type cookieValueGetter interface {
	getCookieValue() (string, error)
}

type envString string

func (es envString) getCookieValue() (string, error) {
	val, ok := os.LookupEnv(string(es))
	if !ok {
		return "", fmt.Errorf("%v: missing environment variable", es)
	}
	if val == "" {
		return "", fmt.Errorf("%v: environment variable is empty", es)
	}

	return val, nil
}

type jwtToken string

func (jt jwtToken) getCookieValue() (string, error) {
	val, err := envString(jt).getCookieValue()
	if err != nil {
		return "", err
	}

	sec, err := uuid.Parse(val)
	if err != nil {
		return "", fmt.Errorf("%v: %v", jt, err)
	}

	if sec.Version() != uuid.Version(4) {
		return "", fmt.Errorf("%v: must be a version 4 UUID", jt)
	}

	sk := jose.SigningKey{
		Algorithm: jose.HS256,
		Key:       []byte(sec.String()),
	}
	so := &jose.SignerOptions{}
	sig, err := jose.NewSigner(sk, so.WithType("JWT"))
	if err != nil {
		return "", fmt.Errorf("%v: error creating JWT signer: %v", jt, err)
	}

	cl := jwt.Claims{
		Subject: "",
	}
	signed, err := jwt.Signed(sig).Claims(cl).CompactSerialize()
	if err != nil {
		return "", fmt.Errorf("%v: error signing JWT: %v", jt, err)
	}

	return signed, nil
}

var environmentCookies = map[string]cookieValueGetter{
	"centrifugo_token": jwtToken("CENTRIFUGO_TOKEN_HMAC_SECRET_KEY"),
	"influxdb_url":     envString("INFLUXDB_URL"),
	"influxdb_org":     envString("INFLUXDB_ORG"),
	"influxdb_bucket":  envString("INFLUXDB_BUCKET"),
	"influxdb_token":   envString("INFLUXDB_READ_TOKEN"),
}

type configMiddlewareProvider interface {
	configCookiesMiddleware(http.Handler) http.Handler
}

type defaultConfigMiddlewareProvider struct{}

func (cmp *defaultConfigMiddlewareProvider) configCookiesMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" && r.Method == http.MethodGet {
			cm := make(map[string]string)

			for k, v := range environmentCookies {
				ev, err := v.getCookieValue()
				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
				cm[k] = ev
			}

			for k, v := range cm {
				c := &http.Cookie{
					Name:     k,
					Value:    v,
					SameSite: http.SameSiteStrictMode,
				}
				http.SetCookie(w, c)
			}
		}
		next.ServeHTTP(w, r)
	})
}

var (
	cmp configMiddlewareProvider
)

func init() {
	cmp = &defaultConfigMiddlewareProvider{}
}

func main() {
	fsh := http.FileServer(http.Dir("."))
	mw := cmp.configCookiesMiddleware(fsh)
	lh := handlers.CombinedLoggingHandler(os.Stdout, mw)
	addr := fmt.Sprintf(":%v", bindPort)
	log.Printf("Listening for HTTP requests on %v", addr)
	log.Fatal(http.ListenAndServe(addr, lh))
}
