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
    </v-content>
    <v-footer class="">
      <v-spacer />
      <span class="connection-status d-flex align-center caption">
        <kbd>PLC</kbd> ⬅
        <link-status-icon v-if="linkStatus.ws" :link-status="linkStatus.opc" />
        <v-icon v-else color="orange" small>mdi-help</v-icon>
        ⮕ <kbd>OPC|WS</kbd> ⬅
        <link-status-icon :link-status="linkStatus.ws" />
        ⮕ <kbd>HMI</kbd>
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
  get logoStyle(): CSS.Properties {
    return {
      filter: this.$vuetify.theme.dark === true ? "brightness(1.5)" : undefined,
      height: "90%"
    }
  }
}
</script>
