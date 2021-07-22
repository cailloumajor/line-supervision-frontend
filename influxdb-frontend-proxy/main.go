package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	influxdb2 "github.com/influxdata/influxdb-client-go/v2"
	"github.com/influxdata/influxdb-client-go/v2/api/query"
	"github.com/joho/godotenv"
	"github.com/vrischmann/envconfig"
)

type config struct {
	URL    string `envconfig:"INFLUXDB_URL"`
	Token  string `envconfig:"INFLUXDB_READ_TOKEN"`
	Org    string `envconfig:"INFLUXDB_ORG"`
	Bucket string `envconfig:"INFLUXDB_BUCKET"`
}

func (c *config) init() error {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("error loading .env file: %v", err)
	}

	if err := envconfig.Init(c); err != nil {
		return fmt.Errorf("error loading configuration: %v", err)
	}

	return nil
}

type reducer interface {
	Reduce(*query.FluxRecord)
}

type machineState struct {
	lastState map[string]*int
	chartData []struct {
		name string
		data struct {
			x string
			y [2]int
		}
	}
}

func (m *machineState) Reduce(record *query.FluxRecord) {
	mi := record.ValueByKey("machine_index")
}

type proxyService struct {
	client influxdb2.Client
}

func (p *proxyService) readyHandler(c *gin.Context) {
	ready, err := p.client.Ready(c.Request.Context())
	if ready {
		c.Status(http.StatusNoContent)
		return
	}
	c.AbortWithError(http.StatusInternalServerError, err)
}

func main() {
	cfg := &config{}
	if err := cfg.init(); err != nil {
		log.Fatal(err)
	}

	r := gin.Default()

	ic := influxdb2.NewClient(cfg.URL, cfg.Token)
	defer ic.Close()

	ps := &proxyService{ic}

	r.GET("/ready", ps.readyHandler)

	r.Run(":8080")
}
