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
      <v-overlay :value="!plcLinkUp" absolute opacity="1" z-index="2">
        <v-alert type="error">Pas de connection à l'automate</v-alert>
      </v-overlay>
    </v-main>

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
      <v-btn href="/logs" x-small target="_blank">
        Logs
      </v-btn>
    </v-footer>
  </v-app>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "@vue/composition-api"
import * as CSS from "csstype"

import { useInfluxDBStore } from "@/stores/influxdb"
import { useOpcUaStore } from "@/stores/opcua"
import { LinkStatus } from "@/stores/types"

interface LinkData {
  text: string
  color: string
  icon: string
}

export default defineComponent({
  setup(_, { root: { $vuetify } }) {
    const influxDBStore = useInfluxDBStore()
    const opcUaStore = useOpcUaStore()

    const routes: { name: string; menu: string; icon: string }[] = [
      { name: "Home", menu: "Vue graphique", icon: "mdi-panorama" },
      { name: "About", menu: "À propos", icon: "mdi-information" }
    ]

    const drawer = ref(false)

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
            [LinkStatus.Down]: "mdi-link-off",
            [LinkStatus.Unknown]: "mdi-help"
          }[state]
        }
      }
      return [
        linkData("WS", opcUaStore.state.wsLinkStatus),
        linkData("OPC", opcUaStore.opcLinkStatus.value),
        linkData("InfluxDB", influxDBStore.state.linkStatus)
      ]
    })

    const logoStyle = computed<CSS.Properties>(() => ({
      filter: $vuetify.theme.dark === true ? "brightness(1.5)" : undefined,
      height: "90%"
    }))

    return {
      routes,
      drawer,
      linksData,
      logoStyle,
      plcLinkUp: opcUaStore.plcLinkUp
    }
  }
})
</script>
