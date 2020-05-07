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
      <v-overlay :value="linkDown" absolute opacity="1">
        <v-alert type="error">Pas de connection à l'automate</v-alert>
      </v-overlay>
    </v-content>
    <v-footer class="">
      <v-spacer />
      <span class="connection-status d-flex align-center caption">
        <kbd>PLC</kbd>
        <v-icon small>mdi-arrow-left-bold</v-icon>
        <link-status-icon v-if="linkStatus.ws" :link-status="linkStatus.opc" />
        <v-icon v-else color="orange" small>mdi-help</v-icon>
        <v-icon small>mdi-arrow-right-bold</v-icon>
        <kbd>OPC|WS</kbd>
        <v-icon small>mdi-arrow-left-bold</v-icon>
        <link-status-icon :link-status="linkStatus.ws" />
        <v-icon small>mdi-arrow-right-bold</v-icon>
        <kbd>HMI</kbd>
      </span>
    </v-footer>
  </v-app>
</template>

<script lang="ts">
import * as CSS from "csstype"
import { Component, Vue } from "vue-property-decorator"

import LinkStatusIcon from "@/components/LinkStatusIcon.vue"
import { automationMapper } from "@/store/modules/automation"

const mapped = Vue.extend({
  computed: automationMapper.mapGetters(["linkStatus"])
})

@Component({
  components: {
    LinkStatusIcon
  }
})
export default class App extends mapped {
  get linkDown() {
    // const { opc, ws } = this.linkStatus
    // return !(opc && ws)
    return false // TODO: remove in production
  }
  get logoStyle(): CSS.Properties {
    return {
      filter: this.$vuetify.theme.dark === true ? "brightness(1.5)" : undefined,
      height: "90%"
    }
  }
}
</script>
