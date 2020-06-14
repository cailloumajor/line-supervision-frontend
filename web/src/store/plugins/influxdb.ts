import { flux, InfluxDB } from "@influxdata/influxdb-client"
import { Plugin } from "vuex"

import { automation } from "../modules/automation"

export default function createVuexPlugin(
  url: string,
  DBName: string
  // eslint-disable-next-line
): Plugin<any> {
  return store => {
    const ctx = automation.context(store)
    const influxDB = new InfluxDB({ url })
    const queryAPI = influxDB.getQueryApi("")
    const bucket = `${DBName}/autogen`
    const query = flux`\
      from(bucket: "${bucket}")
        |> range(start: -8h)
        |> increase()
        |> yield()`

    function influxQuery() {
      queryAPI.queryRows(query, {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row)
        },
        error(error) {
          ctx.mutations.influxLinkDown()
          console.error(error)
        },
        complete() {
          ctx.mutations.influxLinkUp()
        }
      })
    }

    influxQuery()
    window.setInterval(influxQuery, 60000)
  }
}
