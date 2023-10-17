<template>
  <v-overlay :value="!opcUaStore.plcLinkUp" absolute opacity="0.8" z-index="2">
    <v-alert type="error">Pas de connection à l'automate</v-alert>
  </v-overlay>
</template>

<script lang="ts">
import { defineComponent } from "@vue/composition-api"

import useOpcUaStore from "@/stores/opcua"

export default defineComponent({
  setup() {
    const opcUaStore = useOpcUaStore()

    return {
      opcUaStore,
    }
  },
})
</script>
