import "./influx-charts.scss"

import type { ComputedRef } from "@vue/composition-api"
import type { ApexOptions } from "apexcharts"
import type { VNode } from "vue"
import type { Options as InfluxComposableOptions } from "@/composables/influx-query"

import { computed, h } from "@vue/composition-api"
import merge from "lodash/merge"
import ApexChart from "vue-apexcharts"
import { VAlert, VOverlay, VProgressCircular } from "vuetify/lib"

import useInfluxQuery from "@/composables/influx-query"
import useResponsiveness from "@/composables/responsiveness"
import { useTheme } from "@/composables/theme"

interface ComponentContext<T> extends InfluxComposableOptions<T> {
  chartType: NonNullable<ApexChart["type"]>
  chartOptions: ComputedRef<ApexOptions>
}

export default function <T extends Array<unknown>>(
  ctx: ComponentContext<T>
): () => VNode {
  const theme = useTheme()
  const { influxData, loading, queryError } = useInfluxQuery(ctx)

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
        series: influxData.value,
        type: ctx.chartType,
      },
    })

    let overlayChildEl: VNode | null = null

    if (loading.value) {
      overlayChildEl = h(VProgressCircular, {
        props: {
          indeterminate: true,
        },
      })
    }
    if (queryError.value) {
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
            queryError.value
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
          value: loading.value || queryError.value,
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
