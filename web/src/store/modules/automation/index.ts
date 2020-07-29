import {
  createMapper,
  Actions,
  Getters,
  Module,
  Mutations,
} from "vuex-smart-module"

import { MachineMetrics } from "./types"

interface StateMutationPayload {
  state: boolean
  error?: Error
}

const defaultMachineMetrics: MachineMetrics = {
  machineState: {
    cycle: false,
    alert: false,
    alarm: false,
    missingParts: false,
    saturation: false,
  },
  counters: {
    production: 0,
    toolChangePercent: 0,
    partControlPercent: 0,
    bufferFillPercent: 0,
    cycleTimePercent: 0,
  },
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
      ws: this.state.wsLinkActive,
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

  setInfluxLinkState(payload: boolean) {
    this.state.influxLinkActive = payload
  }

  setOPCLinkState(payload: boolean) {
    this.state.opcLinkActive = payload
  }

  setWSLinkState(payload: boolean) {
    this.state.wsLinkActive = payload
  }
}

class AutomationActions extends Actions<
  AutomationState,
  AutomationGetters,
  AutomationMutations,
  AutomationActions
> {
  changeInfluxLinkState(payload: StateMutationPayload) {
    if (payload.error && !payload.state && this.state.influxLinkActive) {
      console.error(payload.error)
    }
    if (this.state.influxLinkActive !== payload.state) {
      this.mutations.setInfluxLinkState(payload.state)
    }
  }

  changeOPCLinkState(payload: StateMutationPayload) {
    if (payload.error && !payload.state && this.state.opcLinkActive) {
      console.error(payload.error)
    }
    if (this.state.opcLinkActive !== payload.state) {
      this.mutations.setOPCLinkState(payload.state)
    }
  }

  changeWSLinkState(payload: StateMutationPayload) {
    if (payload.error && !payload.state && this.state.wsLinkActive) {
      console.error(payload.error)
    }
    if (this.state.wsLinkActive !== payload.state) {
      this.mutations.setWSLinkState(payload.state)
    }
  }
}

export const automation = new Module({
  state: AutomationState,
  getters: AutomationGetters,
  mutations: AutomationMutations,
  actions: AutomationActions,
})

export const automationMapper = createMapper(automation)

export * from "./types"
