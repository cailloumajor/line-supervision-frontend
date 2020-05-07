<template>
  <div class="home">
    <line-synoptics />
  </div>
</template>

<script>
import { Component, Vue } from "vue-property-decorator"

import LineSynoptics from "@/components/LineSynoptics.vue"

@Component({
  components: {
    LineSynoptics
  }
})
export default class Home extends Vue {}
</script>
