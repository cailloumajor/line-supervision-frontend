package main

import (
	"errors"
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
