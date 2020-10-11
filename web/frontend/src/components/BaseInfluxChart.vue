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
      :value="error || loading"
      absolute
      opacity="0"
      z-index="1"
    >
      <v-alert
        v-if="error"
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
      <v-progress-circular v-if="loading" indeterminate />
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
    error: String,
    loading: Boolean
  }
})
</script>

<style lang="scss" scoped>
.influx-error-text {
  white-space: pre-line;
}
</style>
