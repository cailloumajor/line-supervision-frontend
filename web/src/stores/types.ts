export enum LinkStatus {
  Up,
  Down,
  Unknown
}

export interface MachineState {
  cycle: boolean
  alert: boolean
  alarm: boolean
  missingParts: boolean
  saturation: boolean
}

export interface MachineCounters {
  production: number
  toolChangePercent: number
  partControlPercent: number
  bufferFillPercent: number
  cycleTimePercent: number
}

export interface MachineMetrics {
  machineState: MachineState
  counters: MachineCounters
}

export interface LineGlobalParameters {
  campaignRemaining: number
  productionObjective: number
}

interface OPCMachineMetricsChangeMessage {
  message_type: "opc_data_change"
  node_id: '"dbLineSupervision"."machine"'
  data: MachineMetrics[]
}

interface OPCLineGlobalParametersChangeMessage {
  message_type: "opc_data_change"
  node_id: '"dbLineSupervision"."lineParameters"'
  data: LineGlobalParameters
}

type OPCDataChangeMessage =
  | OPCMachineMetricsChangeMessage
  | OPCLineGlobalParametersChangeMessage

interface OPCStatusMessage {
  message_type: "opc_status"
  data: boolean
}

export type OPCMessage = OPCDataChangeMessage | OPCStatusMessage
