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
import { computed, defineComponent, reactive, ref } from "@vue/composition-api"
import { ApexOptions } from "apexcharts"
import add from "date-fns/add"
import format from "date-fns/format"
import parse from "date-fns/parse"
import sub from "date-fns/sub"
import { merge } from "lodash"

import { commonOptions } from "@/charts"
import { influxDBName, useInfluxDB, RowObject } from "@/functions/influxdb"
import { LineGlobalParameters } from "@/store/modules/automation/types"

import BaseInfluxChart from "@/components/BaseInfluxChart.vue"

interface DataSerie {
  name: string
  data: [number, number][]
}

const seriesNames: { [index: string]: string } = {
  "12": "Total ligne"
}

export default defineComponent({
  components: {
    BaseInfluxChart
  },

  setup(_, { root: { $store, $vuetify } }) {
    const influxDataSeries = ref<DataSerie[]>([])

    const timeRange = reactive({
      start: new Date(),
      end: new Date()
    })

    const linkActive = computed<boolean>(() => $store.state.influxLinkActive)

    const lineGlobalParameters = computed<LineGlobalParameters>(
      () => $store.state.lineGlobalParameters
    )

    const dataSeries = computed<DataSerie[]>(() => [
      {
        name: "Objectif",
        data: [
          [timeRange.start.getTime(), 0],
          [
            timeRange.end.getTime(),
            lineGlobalParameters.value.productionObjective
          ]
        ]
      },
      ...influxDataSeries.value
    ])

    const chartOptions = computed<ApexOptions>(() => {
      const strokeWidths = Array(dataSeries.value.length - 1).fill(5)
      strokeWidths.unshift(2)
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
          lineCap: "round",
          width: strokeWidths
        },
        title: {
          text: "Production"
        },
        xaxis: {
          labels: {
            datetimeUTC: false,
            formatter: (val, timestamp) => format(timestamp as number, "H:mm"),
            offsetY: 5,
            rotateAlways: true
          },
          tickAmount: 8,
          type: "datetime"
        }
      }
      return merge(options, commonOptions($vuetify.theme.dark))
    })

    function updateTimeRange() {
      const now = new Date()
      const shifts = ["21:30:00.0", "13:30:00.0", "05:30:00.0"].map(s =>
        parse(s, "HH:mm:ss.S", now)
      )
      let currentShift = shifts.find(date => date < now)
      if (currentShift === undefined) {
        currentShift = sub(shifts[0], { days: 1 })
      }
      timeRange.start = currentShift
      timeRange.end = add(currentShift, { hours: 8 })
    }

    updateTimeRange()

    const query = flux`\
      from(bucket: "${influxDBName}")
        |> range(start: ${timeRange.start})
        |> filter(fn: (r) =>
          r._measurement == "dbLineSupervision.machine" and
          r._field == "counters.production" and
          contains(value: r.machine_index, set: ${Object.keys(seriesNames)})
        )
        |> increase()
    `

    const queryResult: DataSerie[] = []

    const observer = {
      next: (rowObj: RowObject) => {
        const serieName = seriesNames[rowObj.machine_index]
        const hasSerieName = (s: DataSerie) => s.name === serieName
        if (queryResult.findIndex(hasSerieName) < 0) {
          queryResult.push({ name: serieName, data: [] })
        }
        const serieIdx = queryResult.findIndex(hasSerieName)
        queryResult[serieIdx].data.push([
          Date.parse(rowObj._time),
          rowObj._value
        ])
      },
      complete: () => {
        updateTimeRange()
        influxDataSeries.value = [...queryResult]
      }
    }

    const { queryError } = useInfluxDB({
      query,
      observer,
      linkActive,
      queryInterval: 60000
    })

    return {
      chartOptions,
      dataSeries,
      queryError
    }
  }
})
</script>
