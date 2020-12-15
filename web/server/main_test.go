package main

import (
	"net/http"
	"reflect"
	"testing"
)

func Test_getEnvVar(t *testing.T) {
	type args struct {
		key string
	}
	tests := []struct {
		name    string
		args    args
		wantVal string
		wantErr bool
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotVal, err := getEnvVar(tt.args.key)
			if (err != nil) != tt.wantErr {
				t.Errorf("getEnvVar() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if gotVal != tt.wantVal {
				t.Errorf("getEnvVar() = %v, want %v", gotVal, tt.wantVal)
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
