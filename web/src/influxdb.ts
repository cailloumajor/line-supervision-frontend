import { InfluxDB } from "@influxdata/influxdb-client"

const url = `http://${window.location.host}/influx`

export const queryAPI = new InfluxDB({ url }).getQueryApi("")
export const influxDBName = process.env.VUE_APP_INFLUX_DB_NAME
