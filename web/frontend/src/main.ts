import VueCompositionAPI from "@vue/composition-api"
import { PiniaPlugin, createPinia } from "pinia"
import Vue from "vue"

import router from "./router"
import vuetify from "./plugins/vuetify"

import App from "./App.vue"

Vue.use(VueCompositionAPI)
Vue.use(PiniaPlugin)

const pinia = createPinia()

Vue.config.productionTip = false

new Vue({
  pinia,
  router,
  vuetify,
  render: (h) => h(App),
}).$mount("#app")
