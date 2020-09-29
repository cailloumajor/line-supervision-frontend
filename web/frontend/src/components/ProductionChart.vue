<template>
  <base-influx-chart
    :chart-options="chartOptions"
    :chart-series="dataSeries"
    :error="queryError"
    chart-type="line"
  />
</template>

<script lang="ts">
import { flux } from "@influxdata/influxdb-client"
import { computed, defineComponent, reactive } from "@vue/composition-api"
import { ApexOptions } from "apexcharts"
import dayjs, { Dayjs } from "dayjs"
import cloneDeep from "lodash/cloneDeep"
import merge from "lodash/merge"

import { commonOptions } from "@/charts"
import { influxDBName, useInfluxDB, RowObject } from "@/composables/influxdb"
import { useOpcUaStore } from "@/stores/opcua"

import BaseInfluxChart from "@/components/BaseInfluxChart.vue"

type Point = [string, number | null]

interface DataSerie {
  name: string
  data: Point[]
}

const seriesNames: Record<string, string> = {
  "12": "Total ligne"
}

export default defineComponent({
  components: {
    BaseInfluxChart
  },

  setup(_, { root: { $vuetify } }) {
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

    updateTimeRange()

    const query = flux`\
      from(bucket: "${influxDBName}")
        |> range(start: ${timeRange.start.toDate()})
        |> filter(fn: (r) =>
          r._measurement == "dbLineSupervision.machine" and
          r._field == "counters.production" and
          contains(value: r.machine_index, set: ${Object.keys(seriesNames)})
        )
        |> increase()
        |> aggregateWindow(every: 1m, fn: mean)
        |> toInt()
    `

    const seed: DataSerie[] = []

    const reducer = (acc: DataSerie[], value: RowObject): DataSerie[] => {
      updateTimeRange()
      const serieName = seriesNames[value.machine_index]
      const point: Point = [value._time, value._value]
      const serieIndex = acc.findIndex(s => s.name === serieName)
      if (serieIndex < 0) {
        return [
          ...acc,
          {
            name: serieName,
            data: [point]
          }
        ]
      } else {
        const clone = cloneDeep(acc)
        clone[serieIndex].data.push(point)
        return clone
      }
    }

    const { influxData, queryError } = useInfluxDB(60000, query, seed, reducer)

    const dataSeries = computed<DataSerie[]>(() => [
      {
        name: "Objectif",
        data: [
          [timeRange.start.toISOString(), 0],
          [
            timeRange.end.toISOString(),
            opcUaStore.state.lineGlobalParameters.productionObjective
          ]
        ]
      },
      ...influxData.value
    ])

    const chartOptions = computed<ApexOptions>(() => {
      const strokeWidths = [2, ...Array(dataSeries.value.length - 1).fill(5)]
      const options: ApexOptions = {
        colors: ["#FF4560", "#008FFB", "#00E396", "#FEB019", "#775DD0"],
        dataLabels: {
          enabled: true,
          enabledOnSeries: [0],
          formatter: value => (value === 0 ? "" : value),
          offsetY: -5,
          textAnchor: "end"
        },
        grid: {
          xaxis: {
            lines: {
              show: true
            }
          }
        },
        markers: {
          showNullDataPoints: false
        },
        stroke: {
          width: strokeWidths
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
          tickAmount: 8,
          type: "datetime"
        }
      }
      return merge(options, commonOptions($vuetify.theme.dark))
    })

    return {
      chartOptions,
      dataSeries,
      queryError
    }
  }
})
</script>
