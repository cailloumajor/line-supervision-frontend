<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" app temporary>
      <v-list>
        <v-list-item
          v-for="(route, index) in routes"
          :key="`route-${index}`"
          :to="{ name: route.name }"
          exact
        >
          <v-list-item-icon>
            <v-icon>{{ route.icon }}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ route.menu }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar app dense>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
      <img
        class="ml-1 mr-5 py-1"
        src="@/assets/company-logo.png"
        :style="logoStyle"
      />
      <v-toolbar-title>***REMOVED***</v-toolbar-title>
      <v-spacer />
      <v-btn @click="$vuetify.theme.dark = !$vuetify.theme.dark" icon>
        <v-icon>mdi-theme-light-dark</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <router-view />
      </v-container>
      <v-overlay :value="!plcLinkUp" absolute opacity="0.8" z-index="2">
        <v-alert type="error">Pas de connection à l'automate</v-alert>
      </v-overlay>
    </v-main>

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
      <v-btn v-if="isProdLineScreen" href="/logs" x-small target="_blank">
        Logs
      </v-btn>
    </v-footer>
  </v-app>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "@vue/composition-api"
import { useTimestamp } from "@vueuse/core"
import * as CSS from "csstype"
import dayjs from "dayjs"

import useResponsiveness from "@/composables/responsiveness"
import { provideTheme } from "@/composables/theme"
import useInfluxDBStore from "@/stores/influxdb"
import useOpcUaStore from "@/stores/opcua"
import { LinkStatus } from "@/stores/types"

interface LinkData {
  text: string
  color: string
  icon: string
}

export default defineComponent({
  setup(_, { root: { $vuetify } }) {
    provideTheme(computed(() => $vuetify.theme))

    const influxDBStore = useInfluxDBStore()
    const opcUaStore = useOpcUaStore()

    const routes: { name: string; menu: string; icon: string }[] = [
      { name: "Home", menu: "Vue graphique", icon: "mdi-panorama" },
      { name: "About", menu: "À propos", icon: "mdi-information" }
    ]

    const drawer = ref(false)

    const { timestamp } = useTimestamp()
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
            [LinkStatus.Unknown]: "orange"
          }[state],
          icon: {
            [LinkStatus.Up]: "mdi-swap-horizontal",
            [LinkStatus.Down]: "mdi-link-variant-off",
            [LinkStatus.Unknown]: "mdi-help"
          }[state]
        }
      }
      return [
        linkData("Centrifugo", opcUaStore.centrifugoLinkStatus),
        linkData("OPC bridge", opcUaStore.bridgeLinkStatus),
        linkData("OPC", opcUaStore.opcLinkStatusDisplay),
        linkData("InfluxDB", influxDBStore.linkStatus)
      ]
    })

    const logoStyle = computed<CSS.Properties>(() => ({
      filter: $vuetify.theme.dark === true ? "brightness(1.5)" : undefined,
      height: "80%"
    }))

    const plcLinkUp = computed(
      () => opcUaStore.opcLinkStatusDisplay == LinkStatus.Up
    )

    const { isProdLineScreen } = useResponsiveness()
    if (isProdLineScreen) {
      document.documentElement.classList.add("prod-line-client")
    }

    return {
      routes,
      drawer,
      clock,
      isProdLineScreen,
      linksData,
      logoStyle,
      plcLinkUp
    }
  }
})
</script>

<style lang="scss">
html.prod-line-client {
  font-size: 22px !important;

  .v-alert {
    font-size: 1rem;
  }

  .v-alert__icon {
    font-size: 1.5rem;
  }
}
</style>
