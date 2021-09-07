import type { ApexOptions } from "apexcharts"

import { computed, defineComponent } from "@vue/composition-api"

import useInfluxChart from "@/composables/influx-chart"
import useUiCustomizationStore from "@/stores/ui-customization"
import useOpcUaStore from "@/stores/opcua"

type Point = [string, number | null]

interface DataSerie {
  name: string
  data: Point[]
}

const dateTimeFormat = new Intl.DateTimeFormat([], { timeStyle: "short" })
const timeFormatter = (value: string, timestamp: number | undefined) => {
  if (timestamp === undefined) {
    return "undefined"
  }
  return dateTimeFormat.format(new Date(timestamp))
}

export default defineComponent({
  setup() {
    const uiCustomization = useUiCustomizationStore()
    const opcUaStore = useOpcUaStore()

    const machines = uiCustomization.machines.filter(
      (machine) => machine.production
    )
    const serieName = machines.map((machine) => machine.name).join(" + ")

    const seed: DataSerie[] = [{ name: serieName, data: [] }]

    return useInfluxChart({
      apiEndpoint: "production",

      seed,

      queryInterval: 60000,

      chartType: "line",

      chartOptions: computed<ApexOptions>(() => ({
        annotations: {
          position: "back",
          yaxis: [
            {
              borderColor: "#FF4560",
              borderWidth: 2,
              label: {
                offsetY: -10,
                style: {
                  background: "#FF4560",
                },
                text: "Objectif / heure",
              },
              strokeDashArray: 0,
              y: opcUaStore.lineGlobalParameters.productionObjective,
            },
          ],
        },
        colors: ["#008FFB"],
        dataLabels: {
          enabled: false,
        },
        grid: {
          xaxis: {
            lines: {
              show: true,
            },
          },
        },
        legend: {
          showForSingleSeries: true,
        },
        markers: {
          showNullDataPoints: false,
        },
        stroke: {
          curve: "stepline",
          width: 3,
        },
        title: {
          text: "Production",
        },
        xaxis: {
          labels: {
            datetimeUTC: false,
            formatter: timeFormatter,
            minHeight: 45,
            offsetY: 5,
            rotateAlways: true,
          },
          tickAmount: 8,
          type: "datetime",
        },
        yaxis: {
          forceNiceScale: true,
          max: (max) =>
            Math.max(opcUaStore.lineGlobalParameters.productionObjective, max),
          min: 0,
        },
      })),
    })
  },
})
