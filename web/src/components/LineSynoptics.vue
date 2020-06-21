<template>
  <div class="layout-container" ref="layoutContainer">
    <svg viewBox="0 0 4720 1396.333">
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
          class="machine-path"
          stroke="#999"
        />
        <text :x="data.tagX" :y="data.tagY" class="machine-name">
          {{ data.tagText }}
        </text>
        <circle
          :cx="data.cardX"
          :cy="data.cardY"
          r="10"
          ref="cardAnchor"
          visibility="hidden"
        />
      </g>
    </svg>
    <v-card
      v-for="(card, cardIndex) in cardsData"
      :data-card-index="card.index"
      :key="`machine-card-${cardIndex}`"
      :style="{ left: `${card.x}px`, top: `${card.y}px` }"
      class="machine-card"
      light
      ref="machineCard"
    >
      <v-container class="machine-card-container">
        <v-row no-gutters>
          <v-col
            v-for="(gauge, gaugeIndex) in card.gauges"
            :key="`machine-card-${cardIndex}-gauge-${gaugeIndex}`"
          >
            <v-progress-circular
              :color="gauge.color"
              :rotate="-90"
              :size="32"
              :value="gauge.value"
              :width="5"
              class="gauge"
            >
              <v-icon small>{{ gauge.icon }}</v-icon>
            </v-progress-circular>
          </v-col>
        </v-row>
      </v-container>
    </v-card>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator"

import { automationMapper, MachineState } from "@/store/modules/automation"

interface CardData {
  gauges: {
    value: number
    icon: string
    color: string
  }[]
  x: number
  y: number
  index: number
}

const LAYOUT_DATA = [
  { cardX: 434, cardY: 441, tagX: 434, tagY: 411, tagText: "***REMOVED***" },
  { cardX: 999, cardY: 1284, tagX: 999, tagY: 1254, tagText: "***REMOVED***" },
  { cardX: 1181, cardY: 677, tagX: 1181, tagY: 647, tagText: "***REMOVED***" },
  { cardX: 1793, cardY: 676, tagX: 1793, tagY: 646, tagText: "***REMOVED***" },
  { cardX: 2045, cardY: 293, tagX: 2045, tagY: 263, tagText: "***REMOVED***" },
  { cardX: 2566, cardY: 524, tagX: 2566, tagY: 494, tagText: "***REMOVED***" },
  { cardX: 3110, cardY: 763, tagX: 3110, tagY: 733, tagText: "***REMOVED***" },
  { cardX: 3651, cardY: 780, tagX: 3651, tagY: 750, tagText: "***REMOVED***" },
  { cardX: 3854, cardY: 312, tagX: 3854, tagY: 282, tagText: "***REMOVED***" },
  { cardX: 3281, cardY: 304, tagX: 3281, tagY: 274, tagText: "***REMOVED***" },
  { cardX: 4279, cardY: 551, tagX: 4279, tagY: 521, tagText: "***REMOVED***" },
  { cardX: 4353, cardY: 338, tagX: 4353, tagY: 308, tagText: "***REMOVED***" },
  { cardX: 4550, cardY: 686, tagX: 4550, tagY: 656, tagText: "***REMOVED***" }
]

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
  private resizeObs!: ResizeObserver

  $refs!: {
    cardAnchor: SVGCircleElement[]
    layoutContainer: HTMLDivElement
    machineCard: Vue[]
  }

  cardDOMPositions = [...Array(LAYOUT_DATA.length)].map(() => ({ x: 0, y: 0 }))

  mounted() {
    this.observeResize()
    this.placeMachineCards()
  }

  beforeDestry() {
    this.resizeObs.disconnect()
  }

  observeResize() {
    this.resizeObs = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target === this.$refs.layoutContainer) {
          this.placeMachineCards()
        }
      }
    })
    this.resizeObs.observe(this.$refs.layoutContainer)
  }

  placeMachineCards() {
    this.cardDOMPositions = this.$refs.cardAnchor.map((anchor, index) => {
      const card = this.$refs.machineCard.find(
        card =>
          (card.$el as HTMLDivElement).dataset.cardIndex == index.toString()
      )
      if (card === undefined) {
        return { x: 0, y: 0 }
      }
      const anchorRect = anchor.getBoundingClientRect()
      const anchorCenterX = anchorRect.x + anchorRect.width / 2
      const cardRect = card.$el.getBoundingClientRect()
      const containerRect = this.$refs.layoutContainer.getBoundingClientRect()
      const x = anchorCenterX - cardRect.width / 2 - containerRect.x
      const y = anchorRect.y + anchorRect.height / 2 - containerRect.y
      return { x, y }
    })
  }

  get cardsData(): CardData[] {
    return this.allMachinesMetrics
      .map(({ counters }, index) => {
        return {
          index,
          ...this.cardDOMPositions[index],
          gauges: [
            {
              value: counters.partControlPercent,
              icon: "mdi-eye-check",
              color: "orange"
            },
            {
              value: counters.toolChangePercent,
              icon: "mdi-tools",
              color: "blue"
            },
            {
              value: counters.bufferFillPercent,
              icon: "mdi-robot-industrial",
              color: "brown"
            }
          ].filter(({ value }) => value >= 0)
        }
      })
      .filter(({ gauges }) => gauges.length)
  }

  get layoutData() {
    return this.allMachinesMetrics.map(({ machineState }, index) => {
      return {
        ...LAYOUT_DATA[index],
        stampFill: machineStampColor(machineState),
        stampBlink: machineState.alarm
      }
    })
  }

  @Watch("cardsData")
  onCardsDataChange(val: CardData[], oldVal: CardData[]) {
    if (
      val.length !== oldVal.length ||
      val.some(
        (cardData, index) =>
          cardData.gauges.length !== oldVal[index].gauges.length
      )
    ) {
      this.$nextTick(() => this.placeMachineCards())
    }
  }
}
</script>

<style lang="scss" scoped>
@import "~vuetify/src/styles/styles.sass";

@mixin svg-text($material) {
  fill: map-deep-get($material, "text", "primary");
}

.v-application.theme--light svg text {
  @include svg-text($material-light);
}

.v-application.theme--dark svg text {
  @include svg-text($material-dark);
}

.layout-container {
  position: relative;
}

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
  font-size: 60px;
  font-weight: 700;
  text-anchor: middle;
}

.machine-card {
  display: inline-block;
  position: absolute;
}

.machine-card-container {
  padding: 2px;
}

.gauge {
  $margin-x: 1px;
  margin-left: $margin-x;
  margin-right: $margin-x;
}
</style>
