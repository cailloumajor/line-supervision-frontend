<template>
  <v-icon :color="color" small>{{ iconName }}</v-icon>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator"

@Component
export default class LinkStatusIcon extends Vue {
  @Prop(Boolean) readonly linkStatus: boolean | undefined

  get color() {
    return this.linkStatus ? "green" : "red"
  }

  get iconName() {
    return this.linkStatus ? "mdi-swap-horizontal" : "mdi-link-off"
  }
}
</script>
