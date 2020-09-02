import { createStore } from "pinia"
import { Subject, Subscription, timer } from "rxjs"
import { delayWhen, retryWhen } from "rxjs/operators"
import { webSocket } from "rxjs/webSocket"

import {
  LinkStatus,
  LineGlobalParameters,
  MachineMetrics,
  OPCMessage
} from "./types"

interface StateType {
  machinesMetrics: MachineMetrics[]
  lineGlobalParameters: LineGlobalParameters
  opcLinkStatus: LinkStatus
  wsLinkStatus: LinkStatus
}

const RETRY_DELAY_SEC = 5

const openSubject = new Subject()
const closeSubject = new Subject()
const ws$ = webSocket<OPCMessage>({
  url: `ws://${window.location.host}/ws`,
  openObserver: openSubject,
  closeObserver: closeSubject
}).pipe(
  retryWhen(errors =>
    errors.pipe(delayWhen(() => timer(RETRY_DELAY_SEC * 1000)))
  )
)

let wsSubscription: Subscription

const useStore = createStore({
  id: "OPC-UA",

  state: (): StateType => ({
    machinesMetrics: Array<MachineMetrics>(13).fill({
      machineState: {
        cycle: false,
        alert: false,
        alarm: false,
        missingParts: false,
        saturation: false
      },
      counters: {
        production: 0,
        toolChangePercent: 0,
        partControlPercent: 0,
        bufferFillPercent: 0,
        cycleTimePercent: 0
      }
    }),
    lineGlobalParameters: {
      campaignRemaining: 0,
      productionObjective: 0
    },
    opcLinkStatus: LinkStatus.Down,
    wsLinkStatus: LinkStatus.Down
  }),

  getters: {
    opcLinkStatus: state =>
      state.wsLinkStatus === LinkStatus.Up
        ? state.opcLinkStatus
        : LinkStatus.Unknown,

    plcLinkUp: state =>
      state.opcLinkStatus === LinkStatus.Up &&
      state.wsLinkStatus === LinkStatus.Up
  }
})

export function useOpcUaStore() {
  const store = useStore()

  if (!wsSubscription) {
    openSubject.subscribe(() => {
      store.state.wsLinkStatus = LinkStatus.Up
    })
    closeSubject.subscribe(() => {
      store.state.wsLinkStatus = LinkStatus.Down
    })
    wsSubscription = ws$.subscribe(message => {
      switch (message.message_type) {
        case "opc_data_change":
          store.state.opcLinkStatus = LinkStatus.Up
          switch (message.node_id) {
            case '"dbLineSupervision"."machine"':
              store.state.machinesMetrics = [...message.data]
              break
            case '"dbLineSupervision"."lineParameters"':
              store.state.lineGlobalParameters = { ...message.data }
              break
          }
          break
        case "opc_status":
          if (message.data === false) {
            store.state.opcLinkStatus = LinkStatus.Down
          }
          break
      }
    })
  }

  return store
}
