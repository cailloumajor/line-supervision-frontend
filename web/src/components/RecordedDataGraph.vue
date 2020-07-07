<template>
  <div>
    <div v-if="missingEnvVars.length">
      <v-alert
        v-for="(envVar, index) in missingEnvVars"
        :key="`env-var-${index}`"
        type="error"
      >
        Variable d'environnement {{ envVar }} manquante
      </v-alert>
    </div>
    <apex-chart :options="chartOptions" :series="dataSeries" type="line" />
  </div>
</template>

<script lang="ts">
import { InfluxDB } from "@influxdata/influxdb-client"
import { ApexOptions } from "apexcharts"
import add from "date-fns/add"
import format from "date-fns/format"
import parse from "date-fns/parse"
import sub from "date-fns/sub"
import VueApexCharts from "vue-apexcharts"
import { Component, Vue, Watch } from "vue-property-decorator"

import { automationMapper } from "@/store/modules/automation"

interface RecordedDataSerie {
  name: string
  data: [number, number][]
}

const shiftObjective = 1000 // TODO: make it configurable

const mapped = Vue.extend({
  methods: automationMapper.mapMutations(["influxLinkUp", "influxLinkDown"])
})

@Component({
  components: {
    "apex-chart": VueApexCharts
  }
})
export default class RecordedDataGraph extends mapped {
  private fetchInterval!: number

  chartOptions: ApexOptions = {
    chart: {
      fontFamily: "Roboto",
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    grid: {
      xaxis: {
        lines: {
          show: true
        }
      }
    },
    legend: {
      onItemClick: {
        toggleDataSeries: false
      },
      onItemHover: {
        highlightDataSeries: false
      },
      position: "top"
    },
    markers: {
      showNullDataPoints: false
    },
    title: {
      text: process.env.VUE_APP_INFLUX_MEASUREMENT
    },
    tooltip: {
      enabled: false
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
    },
    yaxis: {
      max: shiftObjective
    }
  }
  dataSeries: RecordedDataSerie[] = []
  envVars: {
    [key: string]: {
      varName: string
      value: string
      missing: boolean
    }
  } = {
    influxDBName: {
      varName: "VUE_APP_INFLUX_DB_NAME",
      value: "",
      missing: false
    },
    influxMeasurement: {
      varName: "VUE_APP_INFLUX_MEASUREMENT",
      value: "",
      missing: false
    }
  }
  timeRange = {
    start: new Date(),
    end: new Date()
  }

  created(): void {
    for (const key in this.envVars) {
      const envVar = process.env[this.envVars[key].varName]
      if (envVar === undefined) {
        this.envVars[key].missing = true
      } else {
        this.envVars[key].value = envVar
      }
    }
    if (this.missingEnvVars.length) {
      return
    }
    setTimeout(this.fetchRecordedData, 0)
    this.fetchInterval = setInterval(this.fetchRecordedData, 60000)
  }

  beforeDestroy(): void {
    clearInterval(this.fetchInterval)
  }

  fetchRecordedData(): void {
    this.updateTimeRange()
    const result: RecordedDataSerie[] = [
      {
        name: "objectif",
        data: [
          [this.timeRange.start.getTime(), 0],
          [this.timeRange.end.getTime(), shiftObjective]
        ]
      }
    ]
    const { influxDBName, influxMeasurement } = this.envVars
    const url = `http://${window.location.host}/influx`
    const queryAPI = new InfluxDB({ url }).getQueryApi("")
    const query = `\
      from(bucket: "${influxDBName.value}")
        |> range(start: ${this.timeRange.start.toISOString()})
        |> filter(fn: (r) => r._measurement == "${influxMeasurement.value}")
        |> increase()
        |> aggregateWindow(every: 1m, fn: mean)
    `
    queryAPI.queryRows(query, {
      next: (row, tableMeta) => {
        const o = tableMeta.toObject(row)
        if (result.findIndex(s => s.name === o._field) < 0) {
          result.push({ name: o._field, data: [] })
        }
        const serieIdx = result.findIndex(s => s.name === o._field)
        const rawValue = row[tableMeta.column("_value").index]
        result[serieIdx].data.push([
          Date.parse(o._time),
          rawValue === "" ? null : o._value
        ])
      },
      error: err => {
        this.influxLinkDown()
        console.error(err)
      },
      complete: () => {
        this.dataSeries = [...result]
        const strokeWidths = Array(result.length - 1).fill(5)
        strokeWidths.unshift(2)
        this.chartOptions = {
          ...this.chartOptions,
          ...{
            stroke: {
              width: strokeWidths
            }
          }
        }
        this.influxLinkUp()
      }
    })
  }

  updateTimeRange(): void {
    const now = new Date()
    const shifts = [
      parse("21:30:00.0", "HH:mm:ss.S", now),
      parse("13:30:00.0", "HH:mm:ss.S", now),
      parse("05:30:00.0", "HH:mm:ss.S", now)
    ]
    let currentShift = shifts.find(date => date < now)
    if (currentShift === undefined) {
      currentShift = sub(shifts[0], { days: 1 })
    }
    this.timeRange.start = currentShift
    this.timeRange.end = add(currentShift, { hours: 8 })
  }

  get missingEnvVars(): string[] {
    return Object.values(this.envVars)
      .filter(v => v.missing)
      .map(v => v.varName)
  }

  @Watch("$vuetify.theme.dark", { immediate: true })
  onVuetifyDarkChanged(val: boolean) {
    const foreColor = val ? "white" : "rgba(0, 0, 0, 0.87)"
    this.chartOptions = {
      ...this.chartOptions,
      ...{
        chart: {
          ...this.chartOptions.chart,
          foreColor
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
::v-deep {
  .apexcharts-legend-text,
  .apexcharts-title-text {
    text-transform: capitalize;
  }
}
</style>
