<template>
  <div>
    <v-row dense justify="center">
      <v-col :cols="isProdLineScreen ? 12 : 10">
        <line-synoptics />
      </v-col>
    </v-row>
    <v-row dense justify="center">
      <v-col cols="4">
        <machine-state-chart />
      </v-col>
      <v-col cols="4">
        <production-chart />
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { defineComponent } from "@vue/composition-api"

import LineSynoptics from "@/components/LineSynoptics.vue"
import MachineStateChart from "@/components/MachineStateChart"
import ProductionChart from "@/components/ProductionChart"
import useResponsiveness from "@/composables/responsiveness"

export default defineComponent({
  components: {
    LineSynoptics,
    MachineStateChart,
    ProductionChart
  },

  setup() {
    const { isProdLineScreen } = useResponsiveness()

    return {
      isProdLineScreen
    }
  }
})
</script>
