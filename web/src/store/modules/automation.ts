import { createMapper, Getters, Mutations, Module } from "vuex-smart-module"

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
}

export interface MachineMetrics {
  machineState: MachineState
  counters: MachineCounters
}

const defaultMachineMetrics = {
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
    partControlPercent: 0
  }
}

class AutomationState {
  machinesMetrics: MachineMetrics[] = [...Array(13)].map(() =>
    JSON.parse(JSON.stringify(defaultMachineMetrics))
  )
  opcLinkActive = false
  wsLinkActive = false
}

class AutomationGetters extends Getters<AutomationState> {
  get allMachinesMetrics() {
    return this.state.machinesMetrics
  }

  get linkStatus() {
    return {
      opc: this.state.opcLinkActive,
      ws: this.state.wsLinkActive
    }
  }
}

class AutomationMutations extends Mutations<AutomationState> {
  setMetrics(payload: MachineMetrics[]) {
    this.state.machinesMetrics = [...payload]
  }

  opcLinkUp() {
    this.state.opcLinkActive = true
  }

  opcLinkDown() {
    this.state.opcLinkActive = false
  }

  wsLinkUp() {
    this.state.wsLinkActive = true
  }

  wsLinkDown() {
    this.state.wsLinkActive = false
  }
}

const automation = new Module({
  state: AutomationState,
  getters: AutomationGetters,
  mutations: AutomationMutations
})

const automationMapper = createMapper(automation)

export { automation, automationMapper }
