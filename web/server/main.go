package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"text/template"

	"github.com/google/uuid"
	"github.com/gorilla/handlers"
	"gopkg.in/square/go-jose.v2"
	"gopkg.in/square/go-jose.v2/jwt"
)

const bindPort = 8080

var frontendConfig = map[string]envGetter{
	"centrifugoToken": jwtToken("CENTRIFUGO_TOKEN_HMAC_SECRET_KEY"),
	"influxdbUrl":     nonEmptyEnv("INFLUXDB_URL"),
	"influxdbOrg":     nonEmptyEnv("INFLUXDB_ORG"),
	"influxdbBucket":  nonEmptyEnv("INFLUXDB_BUCKET"),
	"influxdbToken":   nonEmptyEnv("INFLUXDB_READ_TOKEN"),
}

type envGetter interface {
	fromEnv() (string, error)
}

type nonEmptyEnv string

func (n nonEmptyEnv) fromEnv() (string, error) {
	val, ok := os.LookupEnv(string(n))
	if !ok {
		return "", fmt.Errorf("%v: misssing environment variable", n)
	}
	if len(val) == 0 {
		return "", fmt.Errorf("%v: environment variable is empty", n)
	}

	return val, nil
}

type jwtToken string

func (t jwtToken) fromEnv() (string, error) {
	val, err := nonEmptyEnv(t).fromEnv()
	if err != nil {
		return "", err
	}

	sec, err := uuid.Parse(val)
	if err != nil {
		return "", fmt.Errorf("%v: %v", t, err)
	}

	if sec.Version() != uuid.Version(4) {
		return "", fmt.Errorf("%v: must be a version 4 UUID", t)
	}

	sk := jose.SigningKey{
		Algorithm: jose.HS256,
		Key:       []byte(sec.String()),
	}
	so := &jose.SignerOptions{}
	sig, err := jose.NewSigner(sk, so.WithType("JWT"))
	if err != nil {
		return "", fmt.Errorf("%v: error creating JWT signer: %v", t, err)
	}

	cl := jwt.Claims{
		Subject: "",
	}
	signed, err := jwt.Signed(sig).Claims(cl).CompactSerialize()
	if err != nil {
		return "", fmt.Errorf("%v: error signing JWT: %v", t, err)
	}

	return signed, nil
}

type middlewareProvider interface {
	middleware(http.Handler) http.Handler
}

type frontendConfigMiddleware struct{}

func (f frontendConfigMiddleware) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fail := func(err error) {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}

		if r.URL.Path == "/" && r.Method == http.MethodGet {
			cm := make(map[string]string)
			for k, v := range frontendConfig {
				val, err := v.fromEnv()
				if err != nil {
					fail(err)
					return
				}
				cm[k] = val
			}

			j, err := json.Marshal(cm)
			if err != nil {
				fail(err)
				return
			}

			t, err := template.ParseFiles("index.html")
			if err != nil {
				fail(err)
				return
			}

			if err := t.Execute(w, string(j)); err != nil {
				fail(err)
				return
			}
		} else {
			next.ServeHTTP(w, r)
		}
	})
}

var (
	mp middlewareProvider
)

func init() {
	mp = frontendConfigMiddleware{}
}

func main() {
	fsh := http.FileServer(http.Dir("."))
	mw := mp.middleware(fsh)
	lh := handlers.CombinedLoggingHandler(os.Stdout, mw)
	addr := fmt.Sprintf(":%v", bindPort)
	log.Printf("Listening for HTTP requests on %v", addr)
	log.Fatal(http.ListenAndServe(addr, lh))
}
