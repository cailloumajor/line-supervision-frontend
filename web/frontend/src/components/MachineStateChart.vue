<template>
  <base-influx-chart
    :chart-options="chartOptions"
    :chart-series="influxData"
    :error="queryError"
    chart-type="bar"
  />
</template>

<script lang="ts">
import { flux, fluxExpression } from "@influxdata/influxdb-client"
import { defineComponent, computed } from "@vue/composition-api"
import { ApexOptions } from "apexcharts"
import cloneDeep from "lodash/cloneDeep"
import merge from "lodash/merge"

import { commonOptions } from "@/charts"
import { machineNames } from "@/config"
import { influxDBName, useInfluxDB, RowObject } from "@/composables/influxdb"

import BaseInfluxChart from "@/components/BaseInfluxChart.vue"

interface DataSerie {
  name: string
  data: number[]
}

const monitoredStates = ["alarm", "alert", "cycle"]
const renderedStates = monitoredStates.concat("unknown")
const sortedStates = [2, 1, 3, 0].map(i => renderedStates[i])
const stateFields = monitoredStates.map(state => `machineState.${state}`)
const durationColumns = renderedStates.map(state => `${state}_duration`)
const anyStateCondition = fluxExpression(
  stateFields.map(s => `r["${s}"]`).join(" or ")
)
const stateDurationOps = fluxExpression(
  stateFields
    .map(
      (field, idx) => `\
        |> stateDuration(
          fn: (r) => r["${field}"],
          column: "${durationColumns[idx]}",
          unit: 30s
        )
      `
    )
    .join("")
)
const generateQuery = () => flux`\
  from(bucket: "${influxDBName}")
    |> range(start: -8h)  // TODO: set the start time according to needs
    |> filter(fn: (r) =>
      r._measurement == "dbLineSupervision.machine" and
      contains(value: r._field, set: ${stateFields})
    )
    |> group(columns: ["machine_index"])
    |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
    ${stateDurationOps}
    |> stateDuration(
      fn: (r) => not(${anyStateCondition}),
      column: "${durationColumns.slice(-1)}",
      unit: 30s
    )
    |> increase(columns: ${durationColumns})
    |> top(n:1, columns: ["_time"])
    |> drop(columns: ["_time"])
`

export default defineComponent({
  components: {
    BaseInfluxChart
  },

  setup(_, { root: { $vuetify } }) {
    const chartOptions = computed<ApexOptions>(() => {
      const darkMode = $vuetify.theme.dark
      const options: ApexOptions = {
        chart: {
          stacked: true,
          stackType: "100%"
        },
        colors: ["#080", "#D98D00", darkMode ? "#999" : "#CCC", "#D00"],
        dataLabels: {
          enabled: false
        },
        fill: {
          opacity: 0.6
        },
        grid: {
          yaxis: {
            lines: {
              show: false
            }
          }
        },
        legend: {
          show: false
        },
        title: {
          text: "Fonctionnement machines sur l'équipe"
        },
        xaxis: {
          categories: machineNames
        },
        yaxis: {
          show: false
        }
      }
      return merge(options, commonOptions(darkMode))
    })

    const seed = sortedStates.map(state => ({
      name: state,
      data: new Array(machineNames.length).fill(null)
    }))

    const reducer = (acc: DataSerie[], value: RowObject) => {
      const machineIndex = parseInt(value.machine_index, 10)
      const clone = cloneDeep(acc)
      clone.forEach(serie => {
        serie.data[machineIndex] = value[`${serie.name}_duration`]
      })
      return clone
    }

    const { influxData, queryError } = useInfluxDB(
      60000,
      generateQuery,
      seed,
      reducer
    )

    return {
      chartOptions,
      influxData,
      queryError
    }
  }
})
</script>
