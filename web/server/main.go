package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/google/uuid"
	"github.com/gorilla/handlers"
	"gopkg.in/square/go-jose.v2"
	"gopkg.in/square/go-jose.v2/jwt"
)

const (
	staticRoot             = "/site"
	centrifugoSecretEnvVar = "CENTRIFUGO_TOKEN_HMAC_SECRET_KEY"
	influxDBNameEnvVar     = "INFLUX_DB_NAME"
)

type envVarGetter interface {
	getEnvVar(string) (string, error)
}

type defaultEnvVarGetter struct{}

func (evg *defaultEnvVarGetter) getEnvVar(key string) (val string, err error) {
	val, ok := os.LookupEnv(key)
	if !ok || val == "" {
		return "", fmt.Errorf("Missing %v environment variable", key)
	}
	return val, nil
}

type frontendConfigGetter interface {
	getFrontendConfig() (map[string]string, error)
}

type defaultFrontendConfigGetter struct{}

func (fcg *defaultFrontendConfigGetter) getFrontendConfig() (map[string]string, error) {
	cm := make(map[string]string)

	val, err := evg.getEnvVar(centrifugoSecretEnvVar)
	if err != nil {
		return nil, err
	}

	sec, err := uuid.Parse(val)
	if err != nil {
		return nil, fmt.Errorf("Centrifugo secret key: %v", err)
	}

	if sec.Version() != uuid.Version(4) {
		return nil, errors.New("Centrifugo secret key must be a version 4 UUID")
	}

	sk := jose.SigningKey{
		Algorithm: jose.HS256,
		Key:       []byte(sec.String()),
	}
	so := &jose.SignerOptions{}
	sig, err := jose.NewSigner(sk, so.WithType("JWT"))
	if err != nil {
		return nil, fmt.Errorf("Error creating JWT signer: %v", err)
	}

	cl := jwt.Claims{
		Subject: "",
	}
	signed, err := jwt.Signed(sig).Claims(cl).CompactSerialize()
	if err != nil {
		return nil, fmt.Errorf("Error signing JWT: %v", err)
	}

	cm["centrifugo_token"] = signed

	val, err = evg.getEnvVar(influxDBNameEnvVar)
	if err != nil {
		return nil, err
	}

	cm["influx_db_name"] = val

	return cm, nil
}

func configCookiesMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" && r.Method == http.MethodGet {
			fc, err := fcg.getFrontendConfig()
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			for k, v := range fc {
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
	evg envVarGetter
	fcg frontendConfigGetter
)

func init() {
	evg = &defaultEnvVarGetter{}
	fcg = &defaultFrontendConfigGetter{}
}

func main() {
	const addr = ":8080"
	fsh := http.FileServer(http.Dir(staticRoot))
	mw := configCookiesMiddleware(fsh)
	lh := handlers.CombinedLoggingHandler(os.Stdout, mw)
	log.Printf("Listening for HTTP requests on %v", addr)
	log.Fatal(http.ListenAndServe(addr, lh))
}
