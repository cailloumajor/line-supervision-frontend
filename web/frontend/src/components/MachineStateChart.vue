<template>
  <base-influx-chart
    :chart-options="chartOptions"
    :chart-series="influxData"
    :loading="loading"
    :error="queryError"
    chart-type="rangeBar"
  />
</template>

<script lang="ts">
import { flux } from "@influxdata/influxdb-client"
import { computed, defineComponent, reactive } from "@vue/composition-api"
import { ApexOptions } from "apexcharts"
import dayjs from "dayjs"
import cloneDeep from "lodash/cloneDeep"
import merge from "lodash/merge"

import { commonOptions } from "@/charts"
import { stateShapes } from "@/common"
import { machineNames, machineStateChart as config } from "@/config"
import useInfluxDB from "@/composables/influxdb"

import BaseInfluxChart from "@/components/BaseInfluxChart.vue"

interface DataSerie {
  name: string // Machine state
  data: {
    x: string // Machine name
    y: [number, number] // Start and end timestamps
  }[]
}

let lastStateSentinel: { [machineIndex: string]: number | null | undefined }

export default defineComponent({
  components: {
    BaseInfluxChart
  },

  setup(_, { root: { $vuetify } }) {
    const timeRange = reactive({
      start: dayjs(),
      end: dayjs()
    })

    function updateTimeRange() {
      timeRange.start = dayjs().subtract(24, "hour")
      timeRange.end = dayjs()
    }

    const { influxData, loading, queryError } = useInfluxDB<DataSerie[]>({
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
              contains(value: r.machine_index, set: ${config.machineIndexes})
          	)
            |> group(columns: ["machine_index"])
            |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
            |> map(fn: (r) => ({
              r with
              state_index:
                if r["machineState.cycle"] then 1
                else if r["machineState.alert"] then 1
                else if r["machineState.alarm"] then 3
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

      seed: stateShapes.map(shape => ({ name: shape.description, data: [] })),

      reducer: (acc, value) => {
        function getLastElement<T>(arr: Array<T>) {
          return arr[arr.length - 1]
        }
        const machineIndex: string = value.machine_index
        const stateIndex: number | null = value.state_index
        const time = dayjs(value._time).valueOf()
        const lastMachineState = lastStateSentinel[machineIndex]
        const clone = cloneDeep(acc)
        if (lastMachineState !== undefined && lastMachineState !== null) {
          if (lastMachineState !== stateIndex) {
            getLastElement(clone[lastMachineState].data).y[1] = time
          } else {
            getLastElement(clone[stateIndex].data).y[1] = time
          }
        }
        if (lastMachineState !== stateIndex) {
          if (stateIndex !== null) {
            clone[stateIndex].data.push({
              x: machineNames[parseInt(machineIndex, 10)],
              y: [time, time]
            })
          }
          lastStateSentinel[machineIndex] = stateIndex
        }
        return clone
      }
    })

    const chartOptions = computed<ApexOptions>(() => {
      const darkMode = $vuetify.theme.dark
      const options: ApexOptions = {
        colors: stateShapes.map(({ color }) => color(darkMode)),
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
            formatter: value => dayjs(value).format("HH:mm"),
            minHeight: 45,
            rotateAlways: true
          },
          max: timeRange.end.valueOf(),
          min: timeRange.start.valueOf(),
          tickAmount: 8,
          type: "datetime"
        }
      }
      return merge(options, commonOptions(darkMode))
    })

    return {
      chartOptions,
      influxData,
      loading,
      queryError
    }
  }
})
</script>
