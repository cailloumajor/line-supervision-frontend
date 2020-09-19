<template>
  <div class="rounded-lg">
    <apex-chart
      :options="chartOptions"
      :series="chartSeries"
      :type="chartType"
    />
    <v-overlay
      :dark="null"
      :light="null"
      :value="error"
      absolute
      opacity="0"
      z-index="1"
    >
      <v-alert
        border="bottom"
        class="caption"
        colored-border
        elevation="2"
        type="error"
      >
        Erreur de requête InfluxDB :
        <div class="font-italic influx-error-text">
          {{ error }}
        </div>
      </v-alert>
    </v-overlay>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/composition-api"
import { ApexOptions } from "apexcharts"
import ApexChart from "vue-apexcharts"

export default defineComponent({
  components: {
    ApexChart
  },

  props: {
    chartOptions: Object as PropType<ApexOptions>,
    chartSeries: {
      type: Array as PropType<ApexOptions["series"]>,
      required: true
    },
    chartType: {
      type: String,
      required: true
    },
    error: String
  }
})
</script>

<style lang="scss" scoped>
.influx-error-text {
  white-space: pre-line;
}
</style>
