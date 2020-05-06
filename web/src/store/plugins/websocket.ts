import ReconnectingWebSocket from "reconnecting-websocket"
import { Plugin } from "vuex"

import { automation } from "../modules/automation"

// @ts-ignore: Unexpected any
export default function createVuexPlugin(url: string): Plugin<any> {
  return store => {
    const rws = new ReconnectingWebSocket(url)
    rws.addEventListener("open", () => {
      const ctx = automation.context(store)
      ctx.mutations.setWSLinkStatus(true)
    })
    rws.addEventListener("close", () => {
      const ctx = automation.context(store)
      ctx.mutations.setWSLinkStatus(false)
    })
    rws.addEventListener("message", event => {
      try {
        const wsMessage = JSON.parse(event.data)
        const ctx = automation.context(store)
        switch (wsMessage.type) {
          case "opc_data_change":
            ctx.mutations.replaceMetrics(wsMessage.data)
            break
          case undefined:
            console.error(`Unrecognized message from ${event.origin}`)
            break
          default:
            console.warn(`Message type unknown from ${event.origin}`)
        }
      } catch (error) {
        console.error(error)
      }
    })
  }
}
