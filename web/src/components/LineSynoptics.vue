<template>
  <div>
    <svg viewBox="0 0 4656.293 1396.333">
      <defs>
        <path
          id="machine-0-path"
          d="***REMOVED***"
        />
        <path
          id="machine-1-path"
          d="***REMOVED***"
        />
        <path
          id="machine-2-path"
          d="***REMOVED***"
        />
        <path
          id="machine-3-path"
          d="***REMOVED***"
        />
        <path
          id="machine-4-path"
          d="***REMOVED***"
        />
        <path
          id="machine-5-path"
          d="***REMOVED***"
        />
        <path
          id="machine-6-path"
          d="***REMOVED***"
        />
        <path
          id="machine-7-path"
          d="***REMOVED***"
        />
        <path
          id="machine-8-path"
          d="***REMOVED***"
        />
        <path
          id="machine-9-path"
          d="***REMOVED***"
        />
        <path
          id="machine-10-path"
          d="***REMOVED***"
        />
        <path
          id="machine-11-path"
          d="***REMOVED***"
        />
        <path
          id="machine-12-path"
          d="***REMOVED***"
        />
      </defs>
      <g v-for="(data, index) in layoutData" :key="`machine-${index}`">
        <title>{{ `Machine ${index}` }}</title>
        <use
          :class="{ blink: data.stampBlink }"
          :fill="data.stampFill"
          :href="`#machine-${index}-path`"
          ref="machineStamp"
          class="machine-path"
          stroke="#999"
        />
        <text :x="data.tagX" :y="data.tagY" class="machine-name">
          {{ data.tagText }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator"

import { automationMapper, MachineState } from "@/store/modules/automation"

function machineStampColor(state: MachineState) {
  if (state.alarm) return "#d00"
  if (state.alert) return "#d98d00"
  if (state.cycle) return "green"
  return "#CCC"
}

const mapped = Vue.extend({
  computed: automationMapper.mapGetters(["allMachinesMetrics"])
})

@Component
export default class LineSynoptics extends mapped {
  readonly LAYOUT_CONSTANT_DATA = [
    { tagX: 338, tagY: 401, tagText: "***REMOVED***" },
    { tagX: 845, tagY: 1244, tagText: "***REMOVED***" },
    { tagX: 1108, tagY: 637, tagText: "***REMOVED***" },
    { tagX: 1720, tagY: 636, tagText: "***REMOVED***" },
    { tagX: 1891, tagY: 253, tagText: "***REMOVED***" },
    { tagX: 2470, tagY: 484, tagText: "***REMOVED***" },
    { tagX: 3030, tagY: 723, tagText: "***REMOVED***" },
    { tagX: 3567, tagY: 740, tagText: "***REMOVED***" },
    { tagX: 3700, tagY: 272, tagText: "***REMOVED***" },
    { tagX: 3200, tagY: 264, tagText: "***REMOVED***" },
    { tagX: 4125, tagY: 511, tagText: "***REMOVED***" },
    { tagX: 4220, tagY: 298, tagText: "***REMOVED***" },
    { tagX: 4425, tagY: 646, tagText: "***REMOVED***" }
  ]

  get layoutData() {
    return this.allMachinesMetrics.map((machineMetrics, index) => {
      return {
        ...this.LAYOUT_CONSTANT_DATA[index],
        stampFill: machineStampColor(machineMetrics.machineState),
        stampBlink: machineMetrics.machineState.alarm
      }
    })
  }
}
</script>

<style lang="scss" scoped>
.machine-path {
  stroke-width: 6px;

  &.blink {
    animation: blink 2s step-end infinite;
  }
}

@keyframes blink {
  50% {
    fill-opacity: 0.2;
  }
}

.machine-name {
  font-size: 43px;
  font-weight: 700;
}
</style>
