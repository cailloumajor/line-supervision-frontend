import ReconnectingWebSocket from "reconnecting-websocket"
import { Plugin } from "vuex"

import { automation } from "../modules/automation"

export default function createVuexPlugin(
  url: string
  // eslint-disable-next-line
): Plugin<any> {
  return store => {
    const ctx = automation.context(store)
    const rws = new ReconnectingWebSocket(url)
    rws.addEventListener("open", () => {
      ctx.actions.changeWSLinkState({ state: true })
    })
    rws.addEventListener("close", () => {
      ctx.actions.changeWSLinkState({ state: false })
    })
    rws.addEventListener("message", event => {
      try {
        const wsMessage = JSON.parse(event.data)
        switch (wsMessage.message_type) {
          case "opc_data_change":
            ctx.actions.changeOPCLinkState({ state: true })
            switch (wsMessage.node_id) {
              case '"dbLineSupervision"."machine"':
                ctx.mutations.setMetrics(wsMessage.data)
                break
              case '"dbLineSupervision"."shiftProdObjective"':
                ctx.mutations.setProdObjective(wsMessage.data)
                break
            }
            break
          case "opc_status":
            if (wsMessage.data === false) {
              ctx.actions.changeOPCLinkState({ state: false })
            }
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
