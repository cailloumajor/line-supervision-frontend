import { toRefs, watch } from "@vue/composition-api"
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

type StateType = {
  machinesMetrics: MachineMetrics[]
  lineGlobalParameters: LineGlobalParameters
  opcLinkStatus: LinkStatus
  wsLinkStatus: LinkStatus
}

const freshMachineMetrics = () =>
  Array<MachineMetrics>(13).fill({
    machineState: {
      cycle: false,
      alert: false,
      alarm: false,
      missingParts: false,
      saturation: false
    },
    counters: {
      production: 0,
      toolChangePercent: -1,
      partControlPercent: -1,
      bufferFillPercent: -1,
      cycleTimePercent: 0
    }
  })

const useStore = createStore({
  id: "OPC-UA",

  state: (): StateType => ({
    machinesMetrics: freshMachineMetrics(),
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

export function useOpcUaStore() {
  const store = useStore()
  const { opcLinkStatus, wsLinkStatus } = toRefs(store.state)

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

  watch([opcLinkStatus, wsLinkStatus], statuses => {
    if (!statuses.every(status => status === LinkStatus.Up)) {
      store.state.machinesMetrics = freshMachineMetrics()
    }
  })

  return store
}
