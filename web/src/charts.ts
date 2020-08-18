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
    tooltip: {
      enabled: false
    }
  }
}
