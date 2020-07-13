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
