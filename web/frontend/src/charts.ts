import { ApexOptions } from "apexcharts"

export function commonOptions(darkMode: boolean): ApexOptions {
  return {
    chart: {
      animations: {
        enabled: false
      },
      background: "transparent",
      fontFamily: "Roboto",
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    legend: {
      floating: true,
      onItemClick: {
        toggleDataSeries: false
      },
      onItemHover: {
        highlightDataSeries: false
      },
      position: "top"
    },
    theme: {
      mode: darkMode ? "dark" : "light"
    },
    title: {
      margin: 10,
      floating: true
    },
    tooltip: {
      enabled: false
    }
  }
}
