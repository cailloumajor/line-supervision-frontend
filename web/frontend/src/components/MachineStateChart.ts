import { flux } from "@influxdata/influxdb-client-browser"
import { computed, defineComponent, reactive } from "@vue/composition-api"
import { ApexOptions } from "apexcharts"
import dayjs from "dayjs"
import cloneDeep from "lodash/cloneDeep"

import { statePalette, ShapeID } from "@/common"
import useInfluxChart from "@/composables/influx-chart"
import { useTheme } from "@/composables/theme"
import { machineNames, machineStateChart as custom } from "@/customization"

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
  "cycle"
]

export default defineComponent({
  setup() {
    let lastStateSentinel: { [machineIndex: string]: number | null | undefined }

    const theme = useTheme()

    const timeRange = reactive({
      start: dayjs(),
      end: dayjs()
    })

    function updateTimeRange() {
      timeRange.start = dayjs().subtract(24, "hour")
      timeRange.end = dayjs()
    }

    return useInfluxChart<DataSerie[]>({
      queryInterval: 60000,

      generateQuery: dbName => {
        lastStateSentinel = {}
        updateTimeRange()
        return flux`\
          from(bucket: "${dbName}")
            |> range(start: ${timeRange.start.toDate()}, stop: ${timeRange.end.toDate()})
            |> filter(fn: (r) =>
              r._measurement == "dbLineSupervision.machine" and
              r._field =~ /^machineState\./ and
              contains(value: r.machine_index, set: ${custom.machineIndexes})
          	)
            |> group(columns: ["machine_index"])
            |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
            |> map(fn: (r) => ({
              r with
              state_index:
                if r["machineState.cycle"] then 3
                else if r["machineState.alarm"] then 1
                else if r["machineState.alert"] then 2
                else 0
              })
            )
            |> drop(fn: (column) => column =~ /^machineState\./)
            |> aggregateWindow(
              every: 1m,
              column: "state_index",
              fn: (tables=<-, column) => tables |> min(column) |> sum(column)
            )
        `
      },

      seed: monitoredStates.map(state => ({
        name: statePalette[state].description,
        data: custom.machineIndexes.map(machineIndex => ({
          x: machineNames[parseInt(machineIndex, 10)],
          y: [0, 0]
        }))
      })),

      reducer: (acc, value) => {
        function getLastElement<T>(arr: Array<T>) {
          return arr[arr.length - 1]
        }
        const machineIndex: string = value.machine_index
        const stateIndex: number | null = value.state_index
        const time = dayjs(value._time).valueOf()
        const lastStateIndex = lastStateSentinel[machineIndex]
        const clone = cloneDeep(acc)
        if (lastStateIndex !== undefined && lastStateIndex !== null) {
          const stateIndexToUpdate =
            lastStateIndex !== stateIndex ? lastStateIndex : stateIndex
          getLastElement(clone[stateIndexToUpdate].data).y[1] = time
        }
        if (lastStateIndex !== stateIndex) {
          if (stateIndex !== null) {
            clone[stateIndex].data.push({
              x: machineNames[parseInt(machineIndex, 10)],
              y: [time, time]
            })
          }
          lastStateSentinel[machineIndex] = stateIndex
        }
        return clone
      },

      chartType: "rangeBar",

      chartOptions: computed<ApexOptions>(() => ({
        colors: monitoredStates.map(state =>
          statePalette[state].primaryColor(theme.value.dark)
        ),
        dataLabels: {
          enabled: false
        },
        fill: {
          opacity: 0.8
        },
        grid: {
          xaxis: {
            lines: {
              show: true
            }
          },
          yaxis: {
            lines: {
              show: false
            }
          }
        },
        legend: {
          show: false
        },
        plotOptions: {
          bar: {
            horizontal: true,
            rangeBarGroupRows: true
          }
        },
        title: {
          text: "Statuts machines sur 24h"
        },
        xaxis: {
          labels: {
            datetimeUTC: false,
            minHeight: 45,
            rotateAlways: true
          },
          max: timeRange.end.valueOf(),
          min: timeRange.start.valueOf(),
          type: "datetime"
        }
      }))
    })
  }
})
