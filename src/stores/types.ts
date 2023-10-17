export enum LinkStatus {
  Up = "UP",
  Down = "DOWN",
  Unknown = "UNKNOWN",
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

export interface MachineCampaign {
  partReference: string
  materialBatch: string
}

export interface MachineMetrics {
  machineState: MachineState
  counters: MachineCounters
  campaign: MachineCampaign
}

export interface LineGlobalParameters {
  campaignRemaining: number
  productionObjective: number
}

interface OPCMachineMetricsChangeMessage {
  node_id: '"dbLineSupervision"."machine"'
  payload: MachineMetrics[]
}

interface OPCLineGlobalParametersChangeMessage {
  node_id: '"dbLineSupervision"."lineParameters"'
  payload: LineGlobalParameters
}

export type OPCDataChangeMessage =
  | OPCMachineMetricsChangeMessage
  | OPCLineGlobalParametersChangeMessage

export function isMachineMetricsMessage(
  message: OPCDataChangeMessage
): message is OPCMachineMetricsChangeMessage {
  return message.node_id === '"dbLineSupervision"."machine"'
}

export function isLineParametersMessage(
  message: OPCDataChangeMessage
): message is OPCLineGlobalParametersChangeMessage {
  return message.node_id === '"dbLineSupervision"."lineParameters"'
}

export interface OPCStatusMessage {
  payload: LinkStatus
}

export interface HeartBeatMessage {
  payload: null
}
