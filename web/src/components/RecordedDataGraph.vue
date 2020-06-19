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
import { flux, InfluxDB } from "@influxdata/influxdb-client"
import { ApexOptions } from "apexcharts"
import VueApexCharts from "vue-apexcharts"
import { Component, Vue } from "vue-property-decorator"

import { automationMapper } from "@/store/modules/automation"

interface RecordedDataSerie {
  name: string
  data: [number, number][]
}

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

  dataSeries: RecordedDataSerie[] = []
  chartOptions: ApexOptions = {
    chart: {
      fontFamily: "Roboto",
      foreColor: "white",
      selection: {
        enabled: false
      },
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
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
    title: {
      text: process.env.VUE_APP_INFLUX_MEASUREMENT.toUpperCase()
    },
    tooltip: {
      enabled: false
    },
    xaxis: {
      labels: {
        datetimeUTC: false
      },
      type: "datetime"
    }
  }
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

  created(): void {
    for (const key in this.envVars) {
      const envVar = process.env[this.envVars[key].varName]
      if (envVar === undefined) {
        this.envVars[key].missing = true
      } else {
        this.envVars[key].value = envVar
      }
    }
    if (this.missingEnvVars.length) return
    setTimeout(this.fetchRecordedData, 0)
    this.fetchInterval = setInterval(this.fetchRecordedData, 60000)
  }

  beforeDestroy(): void {
    clearInterval(this.fetchInterval)
  }

  fetchRecordedData(): void {
    const result: RecordedDataSerie[] = []
    const { influxDBName, influxMeasurement } = this.envVars
    const url = `http://${window.location.host}/influx`
    const queryAPI = new InfluxDB({ url }).getQueryApi("")
    const query = flux`\
      from(bucket: "${influxDBName.value}")
        |> range(start: -8h)
        |> filter(fn: (r) => r._measurement == "${influxMeasurement.value}")
        |> increase()
    `
    queryAPI.queryRows(query, {
      next: (row, tableMeta) => {
        const o = tableMeta.toObject(row)
        if (result.findIndex(s => s.name === o._field) < 0) {
          result.push({ name: o._field, data: [] })
        }
        const serieIdx = result.findIndex(s => s.name === o._field)
        result[serieIdx].data.push([Date.parse(o._time), o._value])
      },
      error: err => {
        this.influxLinkDown()
        console.error(err)
      },
      complete: () => {
        this.dataSeries = [...result]
        this.influxLinkUp()
      }
    })
  }

  get missingEnvVars(): string[] {
    return Object.values(this.envVars)
      .filter(v => v.missing)
      .map(v => v.varName)
  }
}
</script>
