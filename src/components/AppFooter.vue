<template>
  <v-footer fixed>
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
      isProdLineScreen,
      linksData,
    }
  },
})
</script>
