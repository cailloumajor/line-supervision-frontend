<template>
  <div>
    <v-row dense justify="center">
      <v-col :cols="isProdLineScreen ? 12 : 10">
        <line-synoptics />
      </v-col>
    </v-row>
    <v-row align="center" dense justify="space-around">
      <v-col cols="4">
        <machine-state-chart />
      </v-col>
      <v-col cols="4">
        <production-chart />
      </v-col>
      <v-col cols="auto">
        <campaign-data-table />
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { defineComponent } from "@vue/composition-api"

import CampaignDataTable from "@/components/CampaignDataTable.vue"
import LineSynoptics from "@/components/LineSynoptics.vue"
import MachineStateChart from "@/components/MachineStateChart"
import ProductionChart from "@/components/ProductionChart"
import useResponsiveness from "@/composables/responsiveness"

export default defineComponent({
  components: {
    CampaignDataTable,
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
