import { flux, fluxDuration, fluxExpression } from "@influxdata/influxdb-client"
import { computed, defineComponent, reactive } from "@vue/composition-api"
import { ApexOptions } from "apexcharts"
import dayjs, { Dayjs } from "dayjs"

import { machineNames, productionChart as config } from "@/config"
import useInfluxChart from "@/composables/influx-chart"
import { useOpcUaStore } from "@/stores/opcua"

type Point = [string, number | null]

interface DataSerie {
  name: string
  data: Point[]
}

const serieName = config.machineIndexes
  .map(machIdx => machineNames[parseInt(machIdx)])
  .join(" + ")

export default defineComponent({
  setup() {
    const opcUaStore = useOpcUaStore()

    const timeRange = reactive({
      start: dayjs(),
      end: dayjs()
    })

    function updateTimeRange() {
      const shiftsEnds = Array<Dayjs>(4).fill(dayjs())
      const currentShiftEnd = shiftsEnds
        .map((shiftEnd, index) =>
          shiftEnd
            .hour(5)
            .minute(30)
            .second(0)
            .millisecond(0)
            .add(8 * index, "hour")
        )
        .find(shiftEnd => dayjs().isBefore(shiftEnd)) as Dayjs
      timeRange.start = currentShiftEnd.subtract(8, "hour")
      timeRange.end = currentShiftEnd
    }

    return useInfluxChart<DataSerie[]>({
      queryInterval: 60000,

      generateQuery: dbName => {
        updateTimeRange()
        const windowOffset = fluxDuration(`${timeRange.start.minute()}m`)
        const machineColumns = config.machineIndexes.map(idx => `machine${idx}`)
        const machineSum = fluxExpression(
          machineColumns.map(mc => `r.${mc}`).join(" + ")
        )
        return flux`\
          from(bucket: "${dbName}")
            |> range(start: ${timeRange.start.toDate()})
            |> filter(fn: (r) =>
              r._measurement == "dbLineSupervision.machine" and
              r._field == "counters.production" and
              contains(value: r.machine_index, set: ${config.machineIndexes})
            )
            |> map(fn: (r) => ({ r with machine_index: "machine" + r.machine_index }))
            |> pivot(columnKey: ["machine_index"], rowKey: ["_time"], valueColumn: "_value")
            |> window(every: 1h, offset: ${windowOffset})
            |> increase(columns: ${machineColumns})
            |> top(n: 1, columns: ["_time"])
            |> map(fn: (r) => ({ r with total: ${machineSum} }))
        `
      },

      seed: [{ name: serieName, data: [] }],

      reducer: (acc, value) => {
        const currentData = acc.find(({ name }) => name === serieName)?.data
        return [
          {
            name: serieName,
            data: [
              ...(currentData as Point[]),
              [value._start, value.total],
              [value._time, value.total]
            ]
          }
        ]
      },

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
                  background: "#FF4560"
                },
                text: "Objectif / heure"
              },
              strokeDashArray: 0,
              y: opcUaStore.state.lineGlobalParameters.productionObjective
            }
          ]
        },
        colors: ["#008FFB"],
        dataLabels: {
          enabled: false
        },
        grid: {
          xaxis: {
            lines: {
              show: true
            }
          }
        },
        legend: {
          showForSingleSeries: true
        },
        markers: {
          showNullDataPoints: false
        },
        stroke: {
          curve: "stepline",
          width: 3
        },
        title: {
          text: "Production"
        },
        xaxis: {
          labels: {
            datetimeUTC: false,
            formatter: value => dayjs(value).format("HH:mm"),
            offsetY: 5,
            rotateAlways: true
          },
          max: timeRange.end.valueOf(),
          min: timeRange.start.valueOf(),
          tickAmount: 8,
          type: "datetime"
        },
        yaxis: {
          forceNiceScale: true,
          max: max =>
            Math.max(
              opcUaStore.state.lineGlobalParameters.productionObjective,
              max
            ),
          min: 0
        }
      }))
    })
  }
})
