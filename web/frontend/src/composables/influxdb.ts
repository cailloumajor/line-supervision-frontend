import { InfluxDB } from "@influxdata/influxdb-client-browser"

import useUiConfigStore from "@/stores/ui-config"

let cachedInfluxDB: InfluxDB | undefined

export default function (): {
  influxDB: InfluxDB
} {
  const uiConfig = useUiConfigStore()

  const getInfluxDB = () => {
    if (cachedInfluxDB === undefined) {
      const { token } = uiConfig.config.influxdb
      cachedInfluxDB = new InfluxDB({ url: "/influxdb", token })
    }
    return cachedInfluxDB
  }

  const influxDB = getInfluxDB()

  return {
    influxDB,
  }
}
