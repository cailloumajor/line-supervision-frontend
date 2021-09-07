import "./influx-charts.scss"

import type { ComputedRef } from "@vue/composition-api"
import type { ApexOptions } from "apexcharts"
import type { Observable } from "rxjs"
import type { VNode } from "vue"

import { computed, h, reactive, toRefs } from "@vue/composition-api"
import { from, useSubscription } from "@vueuse/rxjs"
import merge from "lodash/merge"
import { of, timer } from "rxjs"
import { fromFetch } from "rxjs/fetch"
import { catchError, map, switchMap } from "rxjs/operators"
import ApexChart from "vue-apexcharts"
import { VAlert, VOverlay, VProgressCircular } from "vuetify/lib"

import { apiUrl } from "@/common"
import useResponsiveness from "@/composables/responsiveness"
import { useTheme } from "@/composables/theme"
import useInfluxdbStore from "@/stores/influxdb"
import { LinkStatus } from "@/stores/types"

type DataSeries = unknown[]

interface ComponentContext {
  apiEndpoint: string
  seed: DataSeries
  queryInterval: number
  chartType: NonNullable<ApexChart["type"]>
  chartOptions: ComputedRef<ApexOptions>
}

export default function (ctx: ComponentContext): () => VNode {
  interface ChartDisplay {
    series: DataSeries
    error: string
  }

  interface ChartData extends ChartDisplay {
    loading: boolean
    startTime: number
    endTime: number
  }

  const theme = useTheme()

  const influxdbStore = useInfluxdbStore()
  const { linkStatus } = toRefs(influxdbStore.$state)

  const chartData = reactive<ChartData>({
    loading: false,
    error: "",
    series: ctx.seed,
    startTime: 0,
    endTime: 0,
  })

  const body = JSON.stringify({
    seed: ctx.seed,
  })

  const query$: Observable<ChartDisplay> = fromFetch(
    `${apiUrl}/chart-data/${ctx.apiEndpoint}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    }
  ).pipe(
    switchMap((response) => {
      if (response.ok) {
        const getTimeBound = (key: string) => {
          const headerValue = response.headers.get(key)
          if (headerValue === null) {
            throw new Error(`En tête "${key}" manquant`)
          }
          const timestamp = parseInt(headerValue, 10)
          if (isNaN(timestamp)) {
            throw new Error(
              `Erreur de conversion de la valeur de l'en-tête "${key}" en entier`
            )
          }
          return timestamp
        }
        chartData.startTime = getTimeBound("Chart-Start-Time")
        chartData.endTime = getTimeBound("Chart-End-Time")
        return from(response.json())
      } else {
        throw new Error(`${response.status} ${response.statusText}`)
      }
    }),
    map((series) => ({ series, error: "" })),
    catchError((err: Error) => of({ series: ctx.seed, error: err.message }))
  )

  const chartData$: Observable<ChartDisplay> = from(linkStatus).pipe(
    switchMap((status) =>
      status === LinkStatus.Up
        ? timer(1000, ctx.queryInterval).pipe(
            switchMap(() => {
              chartData.loading = true
              return query$
            })
          )
        : of({ series: ctx.seed, error: "" })
    )
  )

  useSubscription(
    chartData$.subscribe({
      next: (result) => {
        chartData.loading = false
        chartData.error = result.error
        chartData.series = [...result.series]
      },
    })
  )

  const commonOptions = computed<ApexOptions>(() => ({
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
    legend: {
      floating: true,
      onItemClick: {
        toggleDataSeries: false,
      },
      onItemHover: {
        highlightDataSeries: false,
      },
      position: "top",
    },
    theme: {
      mode: theme.value.dark ? "dark" : "light",
    },
    title: {
      margin: 20,
      floating: true,
    },
    tooltip: {
      enabled: false,
    },
    states: {
      active: {
        filter: {
          type: "none",
        },
      },
      hover: {
        filter: {
          type: "none",
        },
      },
    },
    xaxis: {
      min: chartData.startTime,
      max: chartData.endTime,
    },
  }))

  const chartFinalOptions = computed(() =>
    merge({}, commonOptions.value, ctx.chartOptions.value)
  )

  const { isProdLineScreen } = useResponsiveness()

  return function () {
    const chartEl = h(ApexChart, {
      props: {
        height: isProdLineScreen ? "200%" : "auto",
        options: chartFinalOptions.value,
        series: chartData.series,
        type: ctx.chartType,
      },
    })

    let overlayChildEl: VNode | null = null

    if (chartData.loading) {
      overlayChildEl = h(VProgressCircular, {
        props: {
          indeterminate: true,
        },
      })
    }
    if (chartData.error) {
      overlayChildEl = h(
        VAlert,
        {
          props: {
            border: "bottom",
            coloredBorder: true,
            elevation: 2,
            type: "error",
          },
          class: "text-caption",
        },
        [
          "Erreur de requête InfluxDB :",
          h(
            "div",
            {
              class: "font-italic",
              style: {
                whiteSpace: "pre-line",
              },
            },
            chartData.error
          ),
        ]
      )
    }

    const overlayEl = h(
      VOverlay,
      {
        props: {
          dark: null,
          light: null,
          value: chartData.loading || chartData.error,
          absolute: true,
          opacity: 0,
          zIndex: 1,
        },
      },
      [overlayChildEl]
    )

    return h("div", { class: "rounded-lg" }, [chartEl, overlayEl])
  }
}
