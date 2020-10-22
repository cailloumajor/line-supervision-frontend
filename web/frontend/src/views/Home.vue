<template>
  <v-row dense justify="center">
    <v-col cols="10">
      <line-synoptics />
    </v-col>
    <v-col cols="4">
      <machine-state-chart />
    </v-col>
    <v-col cols="4">
      <production-chart />
    </v-col>
  </v-row>
</template>

<script>
import { defineComponent } from "@vue/composition-api"

import LineSynoptics from "@/components/LineSynoptics.vue"
import MachineStateChart from "@/components/MachineStateChart"
import ProductionChart from "@/components/ProductionChart"

export default defineComponent({
  components: {
    LineSynoptics,
    MachineStateChart,
    ProductionChart
  }
})
</script>
