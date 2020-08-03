<template>
  <apex-chart
    v-show="timeRange.end - timeRange.start > 0"
    :options="chartOptions"
    :series="dataSeries"
    type="line"
  />
</template>

<script lang="ts">
import { flux, InfluxDB } from "@influxdata/influxdb-client"
import { ApexOptions } from "apexcharts"
import add from "date-fns/add"
import format from "date-fns/format"
import parse from "date-fns/parse"
import sub from "date-fns/sub"
import VueApexCharts from "vue-apexcharts"
import { Component, Vue } from "vue-property-decorator"

import { automationMapper } from "@/store/modules/automation"

interface DataSerie {
  name: string
  data: [number, number][]
}

const seriesNames: { [index: string]: string } = {
  "12": "Total ligne",
}

const mapped = Vue.extend({
  computed: automationMapper.mapState([
    "influxLinkActive",
    "productionObjective",
  ]),
})

@Component({
  components: {
    "apex-chart": VueApexCharts,
  },
})
export default class ProductionChart extends mapped {
  private fetchInterval!: number

  influxDataSeries: DataSerie[] = []
  timeRange = {
    start: new Date(),
    end: new Date(),
  }

  mounted(): void {
    setTimeout(this.fetchData, 1000)
    this.fetchInterval = setInterval(this.fetchData, 60000)
  }

  beforeDestroy(): void {
    clearInterval(this.fetchInterval)
  }

  fetchData(): void {
    this.updateTimeRange()
    if (!this.influxLinkActive) return
    const result: DataSerie[] = []
    const influxDBName = process.env.VUE_APP_INFLUX_DB_NAME
    const url = `http://${window.location.host}/influx`
    const indexes = Object.keys(seriesNames)
    const queryAPI = new InfluxDB({ url }).getQueryApi("")
    const query = flux`\
      from(bucket: "${influxDBName}")
        |> range(start: ${this.timeRange.start})
        |> filter(fn: (r) =>
          r._measurement == "dbLineSupervision.machine" and
          r._field == "counters.production" and
          contains(value: r.machine_index, set: ${indexes})
        )
        |> increase()
    `
    queryAPI.queryRows(query, {
      next: (row, tableMeta) => {
        const o = tableMeta.toObject(row)
        const serieName = seriesNames[o.machine_index]
        const hasSerieName = (s: DataSerie) => s.name === serieName
        if (result.findIndex(hasSerieName) < 0) {
          result.push({ name: serieName, data: [] })
        }
        const serieIdx = result.findIndex(hasSerieName)
        const rawValue = row[tableMeta.column("_value").index]
        result[serieIdx].data.push([
          Date.parse(o._time),
          rawValue === "" ? null : o._value,
        ])
      },
      error: (err) => {
        console.error(err)
      },
      complete: () => {
        this.influxDataSeries = [...result]
      },
    })
  }

  updateTimeRange(): void {
    const now = new Date()
    const shifts = ["21:30:00.0", "13:30:00.0", "05:30:00.0"].map((s) =>
      parse(s, "HH:mm:ss.S", now)
    )
    let currentShift = shifts.find((date) => date < now)
    if (currentShift === undefined) {
      currentShift = sub(shifts[0], { days: 1 })
    }
    this.timeRange.start = currentShift
    this.timeRange.end = add(currentShift, { hours: 8 })
  }

  get chartOptions(): ApexOptions {
    const strokeWidths = Array(this.dataSeries.length - 1).fill(5)
    strokeWidths.unshift(2)
    return {
      chart: {
        animations: {
          enabled: false,
        },
        background: "transparent",
        fontFamily: "Roboto",
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      colors: ["#FF4560", "#008FFB", "#00E396", "#FEB019", "#775DD0"],
      dataLabels: {
        enabled: true,
        enabledOnSeries: [0],
        formatter: (value) => (value === 0 ? "" : value),
        offsetY: -5,
        textAnchor: "end",
      },
      grid: {
        xaxis: {
          lines: {
            show: true,
          },
        },
      },
      legend: {
        onItemClick: {
          toggleDataSeries: false,
        },
        onItemHover: {
          highlightDataSeries: false,
        },
        position: "top",
      },
      markers: {
        showNullDataPoints: false,
      },
      stroke: {
        lineCap: "round",
        width: strokeWidths,
      },
      theme: {
        mode: this.$vuetify.theme.dark ? "dark" : "light",
      },
      title: {
        text: "Production",
      },
      tooltip: {
        enabled: false,
      },
      xaxis: {
        labels: {
          datetimeUTC: false,
          formatter: (val, timestamp) => format(timestamp as number, "H:mm"),
          offsetY: 5,
          rotateAlways: true,
        },
        tickAmount: 8,
        type: "datetime",
      },
    }
  }

  get dataSeries(): DataSerie[] {
    return [
      {
        name: "Objectif",
        data: [
          [this.timeRange.start.getTime(), 0],
          [this.timeRange.end.getTime(), this.productionObjective],
        ],
      },
      ...this.influxDataSeries,
    ]
  }
}
</script>
