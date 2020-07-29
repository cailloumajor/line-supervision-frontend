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
        :src="require('@/assets/company-logo.png')"
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
      <v-overlay
        :value="!(linkStatus.opc && linkStatus.ws)"
        absolute
        opacity="1"
        z-index="2"
      >
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
import axios from "axios"
import * as CSS from "csstype"
import { Component, Vue } from "vue-property-decorator"

import { automationMapper } from "@/store/modules/automation"

enum LinkState {
  Up,
  Down,
  Unknown,
}

interface LinkData {
  text: string
  color: string
  icon: string
}

const mapped = Vue.extend({
  computed: automationMapper.mapGetters(["linkStatus"]),
  methods: automationMapper.mapActions(["changeInfluxLinkState"]),
})

@Component
export default class App extends mapped {
  private influxCheckInterval!: number

  drawer = false
  routes: { name: string; menu: string; icon: string }[] = [
    { name: "Home", menu: "Vue graphique", icon: "mdi-panorama" },
    { name: "About", menu: "À propos", icon: "mdi-information" },
  ]

  mounted(): void {
    setTimeout(this.checkInfluxHealth, 500)
    this.influxCheckInterval = setInterval(this.checkInfluxHealth, 10000)
  }

  beforeDestroy(): void {
    clearInterval(this.influxCheckInterval)
  }

  checkInfluxHealth(): void {
    axios
      .get(`http://${window.location.host}/influx/health`, {
        timeout: 1000,
      })
      .then(() => {
        this.changeInfluxLinkState({ state: true })
      })
      .catch((error) => {
        this.changeInfluxLinkState({ state: false, error })
      })
  }

  get linksData(): LinkData[] {
    function linkData(
      text: string,
      ownState: boolean,
      commonState?: boolean
    ): LinkData {
      let state = ownState ? LinkState.Up : LinkState.Down
      if (commonState !== undefined) {
        state = commonState ? state : LinkState.Unknown
      }
      return {
        text,
        color: {
          [LinkState.Up]: "green",
          [LinkState.Down]: "red",
          [LinkState.Unknown]: "orange",
        }[state],
        icon: {
          [LinkState.Up]: "mdi-swap-horizontal",
          [LinkState.Down]: "mdi-link-off",
          [LinkState.Unknown]: "mdi-help",
        }[state],
      }
    }
    return [
      linkData("WS", this.linkStatus.ws),
      linkData("OPC", this.linkStatus.opc, this.linkStatus.ws),
      linkData("InfluxDB", this.linkStatus.influx),
    ]
  }

  get logoStyle(): CSS.Properties {
    return {
      filter: this.$vuetify.theme.dark === true ? "brightness(1.5)" : undefined,
      height: "90%",
    }
  }
}
</script>
