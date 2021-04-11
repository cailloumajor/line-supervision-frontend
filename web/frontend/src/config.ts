interface ConfigFromServer {
  centrifugoToken: string
  influxdbUrl: string
  influxdbOrg: string
  influxdbBucket: string
  influxdbToken: string
}

function getFrontendConfig(): ConfigFromServer {
  if (process.env.NODE_ENV === "development") {
    return {
      centrifugoToken: process.env.VUE_APP_CENTRIFUGO_TOKEN,
      influxdbUrl: process.env.VUE_APP_INFLUXDB_URL,
      influxdbOrg: process.env.VUE_APP_INFLUXDB_ORG,
      influxdbBucket: process.env.VUE_APP_INFLUXDB_BUCKET,
      influxdbToken: process.env.VUE_APP_INFLUXDB_TOKEN
    }
  } else {
    const configScriptElem = document.getElementById("frontend-config-data")
    return JSON.parse(configScriptElem?.textContent ?? "null")
  }
}

export const frontendConfig = getFrontendConfig()
