import axios from "axios"
import Centrifuge, { PublicationContext } from "centrifuge"
import { createStore } from "pinia"
import {
  BehaviorSubject,
  ReplaySubject,
  Subject,
  concat,
  from,
  fromEvent,
  merge,
  of
} from "rxjs"
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

interface HelloResponse {
  token: string
  last_opc_data: OPCDataChangeMessage[]
  last_opc_status: LinkStatus
}

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

const bridgeHelloURL = "/bridge/hello"
const centrifugoURL = `ws://${window.location.host}/centrifugo/connection/websocket`

const bridgeLinkStatusSubject = new Subject<LinkStatus>()
const centrifugoLinkStatusSubject = new Subject<LinkStatus>()
const opcLinkStatusSubject = new BehaviorSubject(LinkStatus.Unknown)
const initialDataSubject = new ReplaySubject<OPCDataChangeMessage>()
const opcDataChangeSubject = new Subject<OPCDataChangeMessage>()

let initialized = false

export function useOpcUaStore() {
  const store = useStore()

  const setupReactive = async () => {
    try {
      const response = await axios.get(bridgeHelloURL, {
        timeout: 1000
      })
      const {
        token,
        last_opc_data: lastOpcData,
        last_opc_status: lastOpcStatus
      }: HelloResponse = response.data

      const centrifuge = new Centrifuge(centrifugoURL, {
        debug: process.env.NODE_ENV === "development",
        maxRetry: 5000
      })
      centrifuge.setToken(token)

      merge(
        fromEvent(centrifuge, "connect").pipe(mapTo(LinkStatus.Up)),
        fromEvent(centrifuge, "disconnect").pipe(mapTo(LinkStatus.Down))
      ).subscribe(centrifugoLinkStatusSubject)

      from(lastOpcData).subscribe(initialDataSubject)

      const heartbeatSubscription = centrifuge.subscribe("heartbeat")
      fromEvent<PublicationContext>(heartbeatSubscription, "publish")
        .pipe(
          mapTo(LinkStatus.Up),
          timeout(6000),
          catchError((err, caught) => concat(of(LinkStatus.Down), caught)),
          distinctUntilChanged()
        )
        .subscribe(bridgeLinkStatusSubject)

      const dataChangeSubscription = centrifuge.subscribe("opc_data_change")
      fromEvent<PublicationContext>(dataChangeSubscription, "publish")
        .pipe(map(publication => publication.data as OPCDataChangeMessage))
        .subscribe(opcDataChangeSubject)

      const statusSubscription = centrifuge.subscribe("opc_status")
      concat(
        of(lastOpcStatus),
        fromEvent<PublicationContext>(statusSubscription, "publish").pipe(
          map(publication => publication.data as OPCStatusMessage),
          map(message => message.payload)
        )
      ).subscribe(opcLinkStatusSubject)

      centrifuge.connect()
    } catch (err) {
      console.error(err)
    }
  }

  if (!initialized) {
    initialized = true

    setupReactive()

    const opcData$ = concat(initialDataSubject, opcDataChangeSubject)
    opcData$.pipe(filter(isMachineMetricsMessage)).subscribe(message => {
      store.state.machinesMetrics = message.payload
    })
    opcData$.pipe(filter(isLineParametersMessage)).subscribe(message => {
      store.state.lineGlobalParameters = message.payload
    })

    bridgeLinkStatusSubject.subscribe(status => {
      store.state.bridgeLinkStatus = status
    })

    centrifugoLinkStatusSubject.subscribe(status => {
      store.state.centrifugoLinkStatus = status
    })

    opcLinkStatusSubject.subscribe(status => {
      store.state.opcLinkStatus = status
    })

    merge(
      bridgeLinkStatusSubject,
      centrifugoLinkStatusSubject,
      opcLinkStatusSubject
    )
      .pipe(filter(status => status !== LinkStatus.Up))
      .subscribe(() => {
        store.state.machinesMetrics = freshMachineMetrics()
      })
  }

  return store
}
