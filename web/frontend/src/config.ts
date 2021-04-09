import { InfluxDB } from "@influxdata/influxdb-client-browser"
import Cookies from "universal-cookie"

const cookies = new Cookies()

type CookieName =
  | "centrifugo_token"
  | "influxdb_url"
  | "influxdb_org"
  | "influxdb_bucket"
  | "influxdb_token"

if (process.env.NODE_ENV === "development") {
  const cookiesDefaultValues = new Map<CookieName, string>([
    ["centrifugo_token", process.env.VUE_APP_CENTRIFUGO_TOKEN],
    ["influxdb_url", process.env.VUE_APP_INFLUXDB_URL],
    ["influxdb_org", process.env.VUE_APP_INFLUXDB_ORG],
    ["influxdb_bucket", process.env.VUE_APP_INFLUXDB_BUCKET],
    ["influxdb_token", process.env.VUE_APP_INFLUXDB_TOKEN]
  ])
  for (const [key, value] of cookiesDefaultValues) {
    cookies.set(key, value, { sameSite: "strict" })
  }
}

export function cookieValue(name: CookieName) {
  return cookies.get<string>(name, { doNotParse: true })
}

export const influxDB = new InfluxDB({
  url: cookieValue("influxdb_url"),
  token: cookieValue("influxdb_token")
})
