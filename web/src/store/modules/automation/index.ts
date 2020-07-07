import { createMapper, Getters, Module, Mutations } from "vuex-smart-module"

import { MachineMetrics } from "./types"

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
    partControlPercent: 0,
    bufferFillPercent: 0
  }
}

class AutomationState {
  machinesMetrics: MachineMetrics[] = [...Array(13)].map(() =>
    JSON.parse(JSON.stringify(defaultMachineMetrics))
  )
  productionObjective = 0
  influxLinkActive = false
  opcLinkActive = false
  wsLinkActive = false
}

class AutomationGetters extends Getters<AutomationState> {
  get linkStatus() {
    return {
      influx: this.state.influxLinkActive,
      opc: this.state.opcLinkActive,
      ws: this.state.wsLinkActive
    }
  }
}

class AutomationMutations extends Mutations<AutomationState> {
  setMetrics(payload: MachineMetrics[]) {
    this.state.machinesMetrics = [...payload]
  }

  setProdObjective(payload: number) {
    this.state.productionObjective = payload
  }

  influxLinkUp() {
    this.state.influxLinkActive = true
  }

  influxLinkDown() {
    this.state.influxLinkActive = false
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

export const automation = new Module({
  state: AutomationState,
  getters: AutomationGetters,
  mutations: AutomationMutations
})

export const automationMapper = createMapper(automation)

export * from "./types"
