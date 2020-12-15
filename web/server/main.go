package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path"
	"text/template"

	"github.com/dgrijalva/jwt-go"
	"github.com/google/uuid"
	"github.com/gorilla/handlers"
)

const (
	staticRoot             = "/site"
	centrifugoSecretEnvVar = "CENTRIFUGO_TOKEN_HMAC_SECRET_KEY"
	influxDBNameEnvVar     = "INFLUX_DB_NAME"
)

func getEnvVar(key string) (val string, err error) {
	val, ok := os.LookupEnv(key)
	if !ok || val == "" {
		return "", fmt.Errorf("Missing %v environment variable", key)
	}
	return val, nil
}

func getFrontendConfig() (map[string]string, error) {
	cm := make(map[string]string)

	val, err := getEnvVar(centrifugoSecretEnvVar)
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

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.StandardClaims{Subject: ""})
	signed, err := token.SignedString([]byte(sec.String()))
	if err != nil {
		return nil, fmt.Errorf("JWT signing: %v", err)
	}

	cm["centrifugo_token"] = signed

	val, err = getEnvVar(influxDBNameEnvVar)
	if err != nil {
		return nil, err
	}

	cm["influx_db_name"] = val

	return cm, nil
}

func templateIndexHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fail := func(err error) {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}

		if r.URL.Path == "/" {
			fc, err := getFrontendConfig()
			if err != nil {
				fail(err)
				return
			}

			t, err := template.ParseFiles(path.Join(staticRoot, "index.html"))
			if err != nil {
				fail(err)
				return
			}

			if err := t.Execute(w, fc); err != nil {
				fail(err)
				return
			}
		} else {
			next.ServeHTTP(w, r)
		}
	})
}

func main() {
	fsh := http.FileServer(http.Dir(staticRoot))
	h := handlers.CombinedLoggingHandler(os.Stdout, templateIndexHandler(fsh))
	s := &http.Server{
		Addr:    ":8080",
		Handler: h,
	}
	log.Printf("Listening for HTTP requests on %v", s.Addr)
	log.Fatal(s.ListenAndServe())
}
