<template>
  <v-row dense justify="center">
    <v-col>
      <line-synoptics />
    </v-col>
    <v-col align-self="center" cols="4">
      <recorded-data-graph />
    </v-col>
  </v-row>
</template>

<script>
import { Component, Vue } from "vue-property-decorator"

import LineSynoptics from "@/components/LineSynoptics.vue"
import RecordedDataGraph from "@/components/RecordedDataGraph.vue"

@Component({
  components: {
    LineSynoptics,
    RecordedDataGraph
  }
})
export default class Home extends Vue {}
</script>
