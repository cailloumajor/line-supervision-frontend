import Centrifuge, { PublicationContext } from "centrifuge"
import { createStore } from "pinia"
import { concat, fromEvent, merge, of } from "rxjs"
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  timeout
} from "rxjs/operators"
import {
  LineGlobalParameters,
  LinkStatus,
  MachineMetrics,
  OPCDataChangeMessage,
  OPCStatusMessage,
  isLineParametersMessage,
  isMachineMetricsMessage
} from "./types"

type StateType = {
  machinesMetrics: MachineMetrics[]
  lineGlobalParameters: LineGlobalParameters
  bridgeLinkStatus: LinkStatus
  centrifugoLinkStatus: LinkStatus
  opcLinkStatus: LinkStatus
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
    },
    campaign: {
      partReference: "",
      materialBatch: ""
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
    bridgeLinkStatus: LinkStatus.Unknown,
    centrifugoLinkStatus: LinkStatus.Unknown,
    opcLinkStatus: LinkStatus.Unknown
  }),

  getters: {
    opcLinkStatus: state =>
      state.bridgeLinkStatus === LinkStatus.Up
        ? state.opcLinkStatus
        : LinkStatus.Unknown,

    plcLinkUp: (_, { opcLinkStatus }) => opcLinkStatus.value === LinkStatus.Up
  }
})

const centrifugoURL = `ws://${window.location.host}/centrifugo/connection/websocket`
const centrifugoToken: string =
  // eslint-disable-next-line
  (window as any).config?.centrifugoToken || ""

let initialized = false

export function useOpcUaStore() {
  const store = useStore()

  if (!initialized) {
    initialized = true

    const centrifuge = new Centrifuge(centrifugoURL, {
      debug: process.env.NODE_ENV === "development",
      maxRetry: 5000
    })
    centrifuge.setToken(centrifugoToken)

    const centrifugoLinkStatus$ = merge(
      fromEvent(centrifuge, "connect").pipe(mapTo(LinkStatus.Up)),
      fromEvent(centrifuge, "disconnect").pipe(mapTo(LinkStatus.Down))
    )
    centrifugoLinkStatus$.subscribe(status => {
      store.state.centrifugoLinkStatus = status
    })

    const heartbeatSubscription = centrifuge.subscribe("heartbeat")
    const bridgeLinkStatus$ = fromEvent<PublicationContext>(
      heartbeatSubscription,
      "publish"
    ).pipe(
      mapTo(LinkStatus.Up),
      timeout(6000),
      catchError((err, caught) => concat(of(LinkStatus.Down), caught)),
      distinctUntilChanged()
    )
    bridgeLinkStatus$.subscribe(status => {
      store.state.bridgeLinkStatus = status
    })

    const opcDataChangeSubscription = centrifuge.subscribe("opc_data_change")
    const opcData$ = fromEvent<PublicationContext>(
      opcDataChangeSubscription,
      "publish"
    ).pipe(map(publication => publication.data as OPCDataChangeMessage))
    opcData$.pipe(filter(isMachineMetricsMessage)).subscribe(message => {
      store.state.machinesMetrics = message.payload
    })
    opcData$.pipe(filter(isLineParametersMessage)).subscribe(message => {
      store.state.lineGlobalParameters = message.payload
    })

    const opcStatusSubscription = centrifuge.subscribe("opc_status")
    const opcStatus$ = fromEvent<PublicationContext>(
      opcStatusSubscription,
      "publish"
    ).pipe(
      map(publication => publication.data as OPCStatusMessage),
      map(message => message.payload)
    )
    opcStatus$.subscribe(status => {
      store.state.opcLinkStatus = status
    })

    merge(bridgeLinkStatus$, centrifugoLinkStatus$, opcStatus$)
      .pipe(filter(status => status !== LinkStatus.Up))
      .subscribe(() => {
        store.state.machinesMetrics = freshMachineMetrics()
      })

    centrifuge.connect()
  }

  return store
}
