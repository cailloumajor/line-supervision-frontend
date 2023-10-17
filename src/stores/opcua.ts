import type { PublicationContext } from "centrifuge"
import type {
  LineGlobalParameters,
  MachineMetrics,
  OPCDataChangeMessage,
  OPCStatusMessage,
} from "./types"

import Centrifuge from "centrifuge"
import { defineStore } from "pinia"
import {
  catchError,
  concat,
  delay,
  distinctUntilChanged,
  filter,
  first,
  fromEvent,
  map,
  mapTo,
  merge,
  of,
  timeout,
} from "rxjs"

import {
  LinkStatus,
  isLineParametersMessage,
  isMachineMetricsMessage,
} from "./types"
import useUiCustomizationStore from "./ui-customization"

interface StateType {
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
    machinesWithUiCustomization: (state) => {
      const uiCustomization = useUiCustomizationStore()
      return state.machinesMetrics.filter(
        (_, index) => uiCustomization.config.machines[index] !== undefined
      )
    },
    opcLinkStatusDisplay: (state) => {
      if (state.bridgeLinkStatus === LinkStatus.Up) {
        return state.opcLinkStatus
      } else {
        return LinkStatus.Unknown
      }
    },
    plcLinkUp(): boolean {
      return this.opcLinkStatusDisplay === LinkStatus.Up
    },
  },
})

const centrifugoURL = `ws://${window.location.host}/centrifugo/connection/websocket`

let initialized = false

export default function (): ReturnType<typeof useStore> {
  const store = useStore()

  if (!initialized) {
    initialized = true

    const centrifuge = new Centrifuge(centrifugoURL, {
      debug: process.env.NODE_ENV === "development",
      maxRetry: 5000,
    })

    const centrifugoLinkStatus$ = merge(
      fromEvent(centrifuge, "connect").pipe(mapTo(LinkStatus.Up)),
      fromEvent(centrifuge, "disconnect").pipe(mapTo(LinkStatus.Down))
    )
    centrifugoLinkStatus$.subscribe((status) => {
      store.centrifugoLinkStatus = status
    })

    const heartbeatSubscription = centrifuge.subscribe("heartbeat")

    const opcDataChangeSubscription = centrifuge.subscribe("proxied:opc_data")
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
