import { InfluxDB } from "@influxdata/influxdb-client-browser"

import useUiCustomizationStore from "@/stores/ui-customization"

let cachedInfluxDB: InfluxDB | undefined

export default function (): {
  influxDB: InfluxDB
} {
  const uiCustomization = useUiCustomizationStore()

  const getInfluxDB = () => {
    if (cachedInfluxDB === undefined) {
      const { token } = uiCustomization.config.influxdb
      cachedInfluxDB = new InfluxDB({ url: "/influxdb", token })
    }
    return cachedInfluxDB
  }

  const influxDB = getInfluxDB()

  return {
    influxDB,
  }
}
