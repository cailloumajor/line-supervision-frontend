import type { ApexOptions } from "apexcharts"
import type { ShapeID } from "@/common"

import { computed, defineComponent } from "@vue/composition-api"

import { statePalette } from "@/common"
import useInfluxChart from "@/composables/influx-chart"
import { useTheme } from "@/composables/theme"
import useUiCustomizationStore from "@/stores/ui-customization"

interface DataSerie {
  name: string // Machine state
  data: {
    x: string // Machine name
    y: [number, number] // Start and end timestamps
  }[]
}

const monitoredStates: ShapeID[] = [
  "outOfProduction",
  "alarm",
  "alert",
  "cycle",
]

export default defineComponent({
  setup() {
    const theme = useTheme()
    const uiCustomization = useUiCustomizationStore()

    const machines = uiCustomization.machines.filter(
      (machine) => machine.stateChart
    )

    const seed: DataSerie[] = monitoredStates.map((state) => ({
      name: statePalette[state].description,
      data: machines.map(({ name }) => ({
        x: name,
        y: [0, 0],
      })),
    }))

    return useInfluxChart({
      apiEndpoint: "machines-state",

      seed,

      queryInterval: 60000,

      chartType: "rangeBar",

      chartOptions: computed<ApexOptions>(() => ({
        colors: monitoredStates.map((state) =>
          statePalette[state].primaryColor(theme.value.dark)
        ),
        dataLabels: {
          enabled: false,
        },
        fill: {
          opacity: 0.8,
        },
        grid: {
          xaxis: {
            lines: {
              show: true,
            },
          },
          yaxis: {
            lines: {
              show: false,
            },
          },
        },
        legend: {
          show: false,
        },
        plotOptions: {
          bar: {
            horizontal: true,
            rangeBarGroupRows: true,
          },
        },
        title: {
          text: "Statuts machines sur 24h",
        },
        xaxis: {
          labels: {
            datetimeUTC: false,
            minHeight: 45,
            rotateAlways: true,
          },
          type: "datetime",
        },
      })),
    })
  },
})
