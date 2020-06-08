import Vue from "vue"
import Vuex from "vuex"
import { createStore } from "vuex-smart-module"

import { automation } from "./modules/automation"
import createInfluxPlugin from "./plugins/influxdb"
import createWebSocketPlugin from "./plugins/websocket"

Vue.use(Vuex)

const influxDBName = process.env.VUE_APP_INFLUX_DB_NAME
const influxPlugin = createInfluxPlugin(
  `http://${window.location.host}/influx`,
  influxDBName
)

const wsPlugin = createWebSocketPlugin(`ws://${window.location.host}/ws`)

const store = createStore(automation, {
  plugins: [influxPlugin, wsPlugin],
  strict: process.env.NODE_ENV !== "production"
})

export default store
