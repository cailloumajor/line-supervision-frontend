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
      :value="queryError.active"
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
          {{ queryError.text }}
        </div>
      </v-alert>
    </v-overlay>
  </div>
</template>

<script lang="ts">
import { ApexOptions } from "apexcharts"
import VueApexChart from "vue-apexcharts"
import { Component, Prop, Vue } from "vue-property-decorator"

export interface QueryError {
  active: boolean
  text: string
}

@Component({
  components: {
    "apex-chart": VueApexChart
  }
})
export default class BaseChart extends Vue {
  @Prop(Object) readonly chartOptions: ApexOptions | undefined
  @Prop({ type: Array, required: true })
  readonly chartSeries!: ApexOptions["series"]
  @Prop({ type: String, required: true }) readonly chartType!: string
  @Prop({ type: Object, required: true }) readonly queryError!: QueryError
}
</script>

<style lang="scss" scoped>
.influx-error-text {
  white-space: pre-line;
}
</style>
