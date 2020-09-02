<template>
  <v-row dense justify="center">
    <v-col cols="10">
      <line-synoptics />
    </v-col>
    <v-col align-self="center" cols="4">
      <machine-state-chart />
    </v-col>
    <v-col align-self="center" cols="4">
      <production-chart />
    </v-col>
  </v-row>
</template>

<script>
import { Component, Vue } from "vue-property-decorator"

import LineSynoptics from "@/components/LineSynoptics.vue"
import MachineStateChart from "@/components/MachineStateChart.vue"
import ProductionChart from "@/components/ProductionChart.vue"

@Component({
  components: {
    LineSynoptics,
    MachineStateChart,
    ProductionChart
  }
})
export default class Home extends Vue {}
</script>
