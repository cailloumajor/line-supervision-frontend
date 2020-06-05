<template>
  <v-app>
    <v-app-bar app dense>
      <v-app-bar-nav-icon></v-app-bar-nav-icon>
      <img
        class="ml-1 mr-5 py-1"
        :src="require('@/assets/company-logo.png')"
        :style="logoStyle"
      />
      <v-toolbar-title>***REMOVED***</v-toolbar-title>
    </v-app-bar>

    <v-content>
      <v-container fluid>
        <router-view />
      </v-container>
      <v-overlay
        :value="!(linkStatus.opc && linkStatus.ws)"
        absolute
        opacity="1"
      >
        <v-alert type="error">Pas de connection à l'automate</v-alert>
      </v-overlay>
    </v-content>
    <v-footer class="">
      <v-spacer />
      <v-chip
        v-for="state of linkStates"
        :key="`state-${state.text}`"
        class="mx-1"
        small
      >
        <v-icon :color="state.color" class="mr-1" left small>{{
          state.icon
        }}</v-icon>
        {{ state.text }}
      </v-chip>
    </v-footer>
  </v-app>
</template>

<script lang="ts">
import * as CSS from "csstype"
import { Component, Vue } from "vue-property-decorator"

import { automationMapper } from "@/store/modules/automation"

enum LinkState {
  Up,
  Down,
  Unknown
}

const mapped = Vue.extend({
  computed: automationMapper.mapGetters(["linkStatus"])
})

@Component
export default class App extends mapped {
  get linkStates() {
    function linkState(text: string, ownState: boolean, commonState?: boolean) {
      let state = ownState ? LinkState.Up : LinkState.Down
      if (commonState !== undefined) {
        state = commonState ? state : LinkState.Unknown
      }
      return {
        text,
        color: {
          [LinkState.Up]: "green",
          [LinkState.Down]: "red",
          [LinkState.Unknown]: "orange"
        }[state],
        icon: {
          [LinkState.Up]: "mdi-swap-horizontal",
          [LinkState.Down]: "mdi-link-off",
          [LinkState.Unknown]: "mdi-help"
        }[state]
      }
    }
    return [
      linkState("WS", this.linkStatus.ws),
      linkState("OPC", this.linkStatus.opc, this.linkStatus.ws)
    ]
  }

  get logoStyle(): CSS.Properties {
    return {
      filter: this.$vuetify.theme.dark === true ? "brightness(1.5)" : undefined,
      height: "90%"
    }
  }
}
</script>
