<template>
  <v-app>
    <v-overlay v-if="!!(loadingAlert.type && loadingAlert.message)">
      <v-alert class="loading-alert text-center" :type="loadingAlert.type">
        {{ loadingAlert.message }}
      </v-alert>
    </v-overlay>

    <v-navigation-drawer
      v-if="uiCustomization.loaded"
      v-model="drawer"
      app
      temporary
    >
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

    <v-app-bar v-if="uiCustomization.loaded" app dense>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
      <img class="ml-1 mr-5 py-1" :src="apiUrl + '/logo'" :style="logoStyle" />
      <v-app-bar-title>{{ uiCustomization.config.appTitle }}</v-app-bar-title>
      <v-spacer />
      <v-btn
        v-if="!isProdLineScreen"
        @click="$vuetify.theme.dark = !$vuetify.theme.dark"
        icon
      >
        <v-icon>mdi-theme-light-dark</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <router-view v-if="uiCustomization.loaded" />
      </v-container>
      <plc-link-down v-if="uiCustomization.loaded" />
    </v-main>

    <app-footer v-if="uiCustomization.loaded" />
  </v-app>
</template>

<script lang="ts">
import type CSS from "csstype"

import { computed, defineComponent, ref, watch } from "@vue/composition-api"

import { apiUrl } from "@/common"
import useResponsiveness from "@/composables/responsiveness"
import { provideTheme } from "@/composables/theme"
import useUiCustomizationStore from "@/stores/ui-customization"

export default defineComponent({
  // eslint-disable-next-line
  setup(_, { root: { $vuetify } }) {
    provideTheme(computed(() => $vuetify.theme))

    const uiCustomization = useUiCustomizationStore()
    uiCustomization.init()

    const routes: { name: string; menu: string; icon: string }[] = [
      { name: "Home", menu: "Vue graphique", icon: "mdi-panorama" },
      { name: "About", menu: "À propos", icon: "mdi-information" },
    ]

    const drawer = ref(false)

    const loadingAlert = computed((): { type?: string; message?: string } => {
      if (uiCustomization.loading) {
        return {
          type: "info",
          message: "Chargement de la configuration...",
        }
      } else if (uiCustomization.initError) {
        return {
          type: "error",
          message: `Erreur de chargement de la configuration :\n${uiCustomization.initError}`,
        }
      } else {
        return {}
      }
    })

    const logoStyle = computed<CSS.Properties>(() => ({
      filter: $vuetify.theme.dark === true ? "brightness(1.5)" : undefined,
      height: "100%",
    }))

    const { isProdLineScreen } = useResponsiveness()
    if (isProdLineScreen) {
      document.documentElement.classList.add("prod-line-client")
    }

    watch(
      () => uiCustomization.config,
      ({ htmlTitle }) => {
        document.title = htmlTitle
      },
      { deep: true }
    )

    return {
      apiUrl,
      routes,
      drawer,
      isProdLineScreen,
      loadingAlert,
      logoStyle,
      uiCustomization,
    }
  },

  components: {
    AppFooter: () =>
      import(
        /* webpackChunkName: "app-footer" */
        "@/components/AppFooter.vue"
      ),
    PlcLinkDown: () =>
      import(
        /* webpackChunkName: "plc-link-down" */
        "@/components/PlcLinkDown.vue"
      ),
  },
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

.loading-alert {
  white-space: pre-line;
}
</style>
