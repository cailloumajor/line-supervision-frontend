import Centrifuge, { PublicationContext } from "centrifuge"
import { defineStore } from "pinia"
import { concat, fromEvent, merge, of } from "rxjs"
import {
  catchError,
  delay,
  distinctUntilChanged,
  filter,
  first,
  map,
  mapTo,
  timeout,
} from "rxjs/operators"

import { frontendConfig } from "@/config"
import {
  LineGlobalParameters,
  LinkStatus,
  MachineMetrics,
  OPCDataChangeMessage,
  OPCStatusMessage,
  isLineParametersMessage,
  isMachineMetricsMessage,
} from "./types"

type StateType = {
  machinesMetrics: MachineMetrics[]
  lineGlobalParameters: LineGlobalParameters
  bridgeLinkStatus: LinkStatus
  centrifugoLinkStatus: LinkStatus
  opcLinkStatus: LinkStatus
}

const heartbeatTimeout = 8000 // OPC-UA bridge heartbeat timeout in milliseconds
const subscribeRetryDelay = 5000 // Centrifuge subscriptions retry delay in milliseconds

const freshMachineMetrics = () =>
  Array<MachineMetrics>(13).fill({
    machineState: {
      cycle: false,
      alert: false,
      alarm: false,
      missingParts: false,
      saturation: false,
    },
    counters: {
      production: 0,
      toolChangePercent: -1,
      partControlPercent: -1,
      bufferFillPercent: -1,
      cycleTimePercent: 0,
    },
    campaign: {
      partReference: "",
      materialBatch: "",
    },
  })

const useStore = defineStore({
  id: "OPC-UA",

  state: (): StateType => ({
    machinesMetrics: freshMachineMetrics(),
    lineGlobalParameters: {
      campaignRemaining: 0,
      productionObjective: 0,
    },
    bridgeLinkStatus: LinkStatus.Unknown,
    centrifugoLinkStatus: LinkStatus.Unknown,
    opcLinkStatus: LinkStatus.Unknown,
  }),

  getters: {
    opcLinkStatusDisplay: (state): LinkStatus => {
      if (state.bridgeLinkStatus === LinkStatus.Up) {
        return state.opcLinkStatus
      } else {
        return LinkStatus.Unknown
      }
    },
  },
})

const centrifugoURL = `ws://${window.location.host}/centrifugo/connection/websocket`
const { centrifugoToken } = frontendConfig

let initialized = false

export default function (): ReturnType<typeof useStore> {
  const store = useStore()

  if (!initialized) {
    initialized = true

    const centrifuge = new Centrifuge(centrifugoURL, {
      debug: process.env.NODE_ENV === "development",
      maxRetry: 5000,
    })
    centrifuge.setToken(centrifugoToken)

    const centrifugoLinkStatus$ = merge(
      fromEvent(centrifuge, "connect").pipe(mapTo(LinkStatus.Up)),
      fromEvent(centrifuge, "disconnect").pipe(mapTo(LinkStatus.Down))
    )
    centrifugoLinkStatus$.subscribe((status) => {
      store.centrifugoLinkStatus = status
    })

    const heartbeatSubscription = centrifuge.subscribe("heartbeat")

    const opcDataChangeSubscription = centrifuge.subscribe(
      "proxied:opc_data_change"
    )
    opcDataChangeSubscription.unsubscribe()

    const opcStatusSubscription = centrifuge.subscribe("proxied:opc_status")
    opcStatusSubscription.unsubscribe()

    const proxiedChannelsSubscriptions = [
      opcDataChangeSubscription,
      opcStatusSubscription,
    ]
    const opcBridgeSubscriptions = [
      heartbeatSubscription,
      ...proxiedChannelsSubscriptions,
    ]

    fromEvent(heartbeatSubscription, "publish")
      .pipe(first())
      .subscribe(() => {
        for (const proxied of proxiedChannelsSubscriptions) {
          proxied.subscribe()
        }
      })

    merge(
      ...opcBridgeSubscriptions.map((sub) =>
        fromEvent(sub, "error").pipe(mapTo(sub))
      )
    )
      .pipe(delay(subscribeRetryDelay))
      .subscribe((sub) => {
        sub.subscribe()
      })

    const bridgeLinkStatus$ = merge(
      ...opcBridgeSubscriptions.map((sub) => fromEvent(sub, "publish"))
    ).pipe(
      mapTo(LinkStatus.Up),
      timeout(heartbeatTimeout),
      catchError((err, caught) => concat(of(LinkStatus.Down), caught)),
      distinctUntilChanged()
    )
    bridgeLinkStatus$.subscribe((status) => {
      store.bridgeLinkStatus = status
    })

    const opcData$ = fromEvent(opcDataChangeSubscription, "publish").pipe(
      map((pub) => (pub as PublicationContext).data as OPCDataChangeMessage)
    )
    opcData$.pipe(filter(isMachineMetricsMessage)).subscribe((message) => {
      store.machinesMetrics = message.payload
    })
    opcData$.pipe(filter(isLineParametersMessage)).subscribe((message) => {
      store.lineGlobalParameters = message.payload
    })

    const opcStatus$ = fromEvent(opcStatusSubscription, "publish").pipe(
      map((pub) => (pub as PublicationContext).data as OPCStatusMessage),
      map((message) => message.payload)
    )
    opcStatus$.subscribe((status) => {
      store.opcLinkStatus = status
    })

    merge(bridgeLinkStatus$, centrifugoLinkStatus$, opcStatus$)
      .pipe(filter((status) => status !== LinkStatus.Up))
      .subscribe(() => {
        store.machinesMetrics = freshMachineMetrics()
      })

    centrifuge.connect()
  }

  return store
}
