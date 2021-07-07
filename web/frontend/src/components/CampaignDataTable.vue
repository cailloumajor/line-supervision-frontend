<template>
  <v-simple-table>
    <thead>
      <tr>
        <th>MACHINE</th>
        <th>RÉFÉRENCE</th>
        <th>LOT</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, rowIndex) in campaignData" :key="`row-${rowIndex}`">
        <td>{{ row.name }}</td>
        <td :class="row.refClass">{{ row.ref }}</td>
        <td :class="row.batchClass">{{ row.batch }}</td>
      </tr>
    </tbody>
  </v-simple-table>
</template>

<script lang="ts">
import { computed, defineComponent } from "@vue/composition-api"

import useOpcUaStore from "@/stores/opcua"
import useUiConfigStore from "@/stores/ui-config"

const differenciatingClasses = [
  "blue--text text--lighten-1",
  "green--text",
  "orange--text text--darken-2",
  "purple--text text--lighten-2",
  "brown--text text--lighten-2",
]

class DifferenciatingMap {
  private map = new Map<string, string>()

  take(key: string): string | undefined {
    if (key !== "" && !this.map.has(key)) {
      this.map.set(key, differenciatingClasses[this.map.size])
    }
    return this.map.get(key)
  }
}

export default defineComponent({
  setup() {
    const opcUaStore = useOpcUaStore()
    const uiConfig = useUiConfigStore()

    const campaignData = computed(() => {
      const refClasses = new DifferenciatingMap()
      const batchClasses = new DifferenciatingMap()
      const machines = uiConfig.machines.filter((machine) => machine.campaign)
      return machines.map((machine) => {
        const { index, name } = machine
        const { partReference: ref, materialBatch: batch } =
          opcUaStore.machinesMetrics[index].campaign
        return {
          name,
          ref,
          batch,
          refClass: refClasses.take(ref),
          batchClass: batchClasses.take(batch),
        }
      })
    })

    return {
      campaignData,
    }
  },
})
</script>

<style lang="scss" scoped>
table > tbody td {
  font-size: 1rem !important;

  html.prod-line-client & {
    font-weight: bold !important;
  }
}

th,
td {
  height: 2rem !important;
}
</style>
