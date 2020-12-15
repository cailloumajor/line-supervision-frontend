package main

import (
	"net/http"
	"os"
	"reflect"
	"testing"
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
			gotVal, err := getEnvVar(key)
			if (err != nil) != tt.wantErr {
				t.Fatalf("getEnvVar() error = %v, wantErr %v", err, tt.wantErr)
			}
			if gotVal != tt.wantVal {
				t.Fatalf("getEnvVar() = %v, want %v", gotVal, tt.wantVal)
			}
		})
	}
}

func Test_getFrontendConfig(t *testing.T) {
	tests := []struct {
		name    string
		want    frontendConfig
		wantErr bool
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := getFrontendConfig()
			if (err != nil) != tt.wantErr {
				t.Errorf("getFrontendConfig() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("getFrontendConfig() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_templateIndexHandler(t *testing.T) {
	type args struct {
		next http.Handler
	}
	tests := []struct {
		name string
		args args
		want http.Handler
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := templateIndexHandler(tt.args.next); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("templateIndexHandler() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_main(t *testing.T) {
	tests := []struct {
		name string
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			main()
		})
	}
}
