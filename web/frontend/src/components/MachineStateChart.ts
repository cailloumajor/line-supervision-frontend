import type { ApexOptions } from "apexcharts"
import type { ShapeID } from "@/common"

import { flux } from "@influxdata/influxdb-client-browser"
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

    const machineSet = machines.map((machine) => machine.index.toString())
    const machineDict = machines.map(
      ({ index, name }) => flux`${index.toString()}:${name}`
    )
    const fluxQuery = flux`\
      import "contrib/tomhollingworth/events"
      import "dict"

      machines = ${machineDict}

      from(bucket: __bucket__)
        |> range(start: -24h)
        |> filter(fn: (r) => r._measurement == "dbLineSupervision.machine")
        |> filter(fn: (r) => r._field =~ /^machineState\./)
        |> filter(fn: (r) => contains(value: r.machine_index, set: ${machineSet}))
        |> group(columns: ["machine_index"])
        |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> map(
          fn: (r) => ({r with
            state_index: if r["machineState.cycle"] then
              3
            else if r["machineState.alarm"] then
              1
            else if r["machineState.alert"] then
              2
            else
              0,
          })
        )
        |> drop(fn: (column) => column =~ /^machineState\./)
        |> aggregateWindow(
          every: 1m,
          column: "state_index",
          fn: (tables=<-, column) => tables |> min(column) |> sum(column),
        )
        |> fill(column: "state_index", value: -1)
        |> duplicate(column: "state_index", as: "_diff")
        |> difference(columns: ["_diff"], keepFirst: true)
        |> filter(fn: (r) => not exists r._diff or r._diff != 0)
        |> drop(columns: ["_diff"])
        |> events.duration(
          unit: 1s,
          columnName: "duration",
        )
        |> filter(fn: (r) => r.state_index != -1)
        |> map(
          fn: (r) => ({r with
            machine_name: dict.get(
              default: "not found",
              dict: machines,
              key: r.machine_index,
            )
          })
        )
    `

    const seed: DataSerie[] = monitoredStates.map((state) => ({
      name: statePalette[state].description,
      data: machines.map(({ name }) => ({
        x: name,
        y: [0, 0],
      })),
    }))

    return useInfluxChart({
      apiEndpoint: "machines-state",

      fluxQuery,

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
