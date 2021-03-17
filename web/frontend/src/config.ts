import Cookies from "universal-cookie"

const cookies = new Cookies()

type CookieName = "centrifugo_token" | "influx_db_name"

const cookiesDefaultValues = new Map<CookieName, string>([
  ["centrifugo_token", process.env.VUE_APP_CENTRIFUGO_TOKEN],
  ["influx_db_name", process.env.VUE_APP_INFLUX_DB_NAME]
])

if (process.env.NODE_ENV === "development") {
  for (const [key, value] of cookiesDefaultValues) {
    cookies.set(key, value, { sameSite: "strict" })
  }
}

export function cookieValue(name: CookieName) {
  return cookies.get<string>(name, { doNotParse: true })
}
