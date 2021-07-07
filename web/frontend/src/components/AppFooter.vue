<template>
  <v-footer fixed>
    <span class="text-body-2">{{ clock }}</span>
    <v-spacer />
    <v-chip
      v-for="state of linksData"
      :key="`state-${state.text}`"
      class="mx-1"
      small
    >
      <v-icon :color="state.color" class="mr-1" left small>
        {{ state.icon }}
      </v-icon>
      {{ state.text }}
    </v-chip>
    <v-btn v-if="!isProdLineScreen" href="/logs" x-small target="_blank">
      Logs
    </v-btn>
  </v-footer>
</template>

<script lang="ts">
import { computed, defineComponent } from "@vue/composition-api"
import { useTimestamp } from "@vueuse/core"
import dayjs from "dayjs"

import useResponsiveness from "@/composables/responsiveness"
import useInfluxDBStore from "@/stores/influxdb"
import useOpcUaStore from "@/stores/opcua"
import { LinkStatus } from "@/stores/types"

interface LinkData {
  text: string
  color: string
  icon: string
}

export default defineComponent({
  setup() {
    const influxDBStore = useInfluxDBStore()
    const opcUaStore = useOpcUaStore()

    const { isProdLineScreen } = useResponsiveness()

    const timestamp = useTimestamp({ interval: 1000 })
    const clock = computed(() =>
      dayjs(timestamp.value).format("DD/MM/YYYY HH:mm:ss")
    )

    const linksData = computed<LinkData[]>(() => {
      function linkData(text: string, state: LinkStatus): LinkData {
        return {
          text,
          color: {
            [LinkStatus.Up]: "green",
            [LinkStatus.Down]: "red",
            [LinkStatus.Unknown]: "orange",
          }[state],
          icon: {
            [LinkStatus.Up]: "mdi-swap-horizontal",
            [LinkStatus.Down]: "mdi-link-variant-off",
            [LinkStatus.Unknown]: "mdi-help",
          }[state],
        }
      }
      return [
        linkData("Centrifugo", opcUaStore.centrifugoLinkStatus),
        linkData("OPC bridge", opcUaStore.bridgeLinkStatus),
        linkData("OPC", opcUaStore.opcLinkStatusDisplay),
        linkData("InfluxDB", influxDBStore.linkStatus),
      ]
    })

    return {
      clock,
      isProdLineScreen,
      linksData,
    }
  },
})
</script>
