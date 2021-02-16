// Load self-hosted webfonts
import "@mdi/font/css/materialdesignicons.css"
import "@fontsource/roboto"

import Vue from "vue"
import Vuetify from "vuetify/lib/framework"

Vue.use(Vuetify)

export default new Vuetify({
  theme: {
    dark: true,
    options: {
      variations: false
    }
  }
})
