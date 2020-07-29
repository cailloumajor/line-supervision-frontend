import Vue from "vue"
import Vuex from "vuex"
import { createStore } from "vuex-smart-module"

import { automation } from "./modules/automation"
import createWebSocketPlugin from "./plugins/websocket"

Vue.use(Vuex)

const wsPlugin = createWebSocketPlugin(`ws://${window.location.host}/ws`)

const store = createStore(automation, {
  plugins: [wsPlugin],
  strict: process.env.NODE_ENV !== "production",
})

export default store
