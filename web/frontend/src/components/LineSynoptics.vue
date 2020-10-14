<template>
  <div class="layout-container" ref="layoutContainer">
    <v-container class="pa-0 my-1">
      <v-row align="center" justify="space-around" no-gutters>
        <v-col
          v-for="(icon, name) in cardIcons()"
          :key="`legend-icon-${name}`"
          class="text-caption"
          md="auto"
        >
          <v-progress-circular
            v-if="icon.show === undefined"
            :color="icon.color"
            :rotate="-90"
            :size="28"
            :value="80"
            class="gauge"
          >
            <v-icon x-small>{{ icon.icon }}</v-icon>
          </v-progress-circular>
          <v-icon v-else :color="icon.color">{{ icon.icon }}</v-icon>
          {{ icon.description }}
        </v-col>
      </v-row>
    </v-container>
    <svg viewBox="0 0 4720 1396.333">
      <defs>
        <pattern
          id="hatchPattern"
          width="20"
          height="10"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect x="0" y="0" width="100%" height="100%" fill="#aaa" />
          <line x2="0" y2="100%" stroke="green" stroke-width="15" />
        </pattern>
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
          :class="{ blink: data.thumbBlink }"
          :fill="data.thumbFill"
          :href="`#machine-${index}-path`"
          class="machine-path"
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
      <text class="remaining-counter" x="450" y="130">
        Reste à produire rafale
        <tspan x="450" dy="1.2em">
          {{ opcUaState.lineGlobalParameters.campaignRemaining }}
        </tspan>
      </text>
    </svg>
    <v-card
      v-for="(card, cardIndex) in cardsData"
      :data-card-index="card.index"
      :key="`machine-card-${cardIndex}`"
      :style="{ left: `${card.x}px`, top: `${card.y}px` }"
      class="machine-card"
      outlined
      ref="machineCard"
    >
      <template v-for="(icon, iconIndex) in card.icons">
        <v-progress-circular
          v-if="icon.value !== undefined"
          :key="`machine-card-${cardIndex}-icon-${iconIndex}`"
          :color="icon.color"
          :rotate="-90"
          :size="32"
          :value="icon.value"
          :width="5"
          class="gauge"
        >
          <v-icon small>{{ icon.icon }}</v-icon>
        </v-progress-circular>
        <v-icon
          v-if="icon.show"
          :key="`machine-card-${cardIndex}-icon-${iconIndex}`"
          :color="icon.color"
          class="cycle-time"
          size="32"
        >
          {{ icon.icon }}
        </v-icon>
      </template>
    </v-card>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from "@vue/composition-api"
import Vue from "vue"

import { useTheme } from "@/composables/theme"
import { machineNames } from "@/config"
import { useOpcUaStore } from "@/stores/opcua"
import { MachineCounters, MachineState } from "@/stores/types"

interface CardIcon {
  icon: string
  color: string
  description: string
  value?: number
  show?: boolean
}

interface CardData {
  index: number
  x: number
  y: number
  icons: CardIcon[]
}

interface LayoutMachineData {
  tagText: string
  thumbFill: string
  thumbBlink: boolean
  cardX: number
  cardY: number
  tagX: number
  tagY: number
}

const cardIcons = (counters?: MachineCounters): CardIcon[] => [
  {
    icon: "mdi-eye-check",
    color: "orange darken-3",
    description: "Contrôle fréquentiel",
    value: counters?.partControlPercent
  },
  {
    icon: "mdi-tools",
    color: "blue darken-1",
    description: "Contrôle ou changement d'outils",
    value: counters?.toolChangePercent
  },
  {
    icon: "mdi-robot-industrial",
    color: "purple darken-1",
    description: "Remplissage stockeur robot",
    value: counters?.bufferFillPercent
  },
  {
    icon: "mdi-timer-outline",
    color: "orange",
    description: "Dépassement temps de cycle ≤ 105%",
    show:
      (counters?.cycleTimePercent || 0) > 100 &&
      (counters?.cycleTimePercent || 0) <= 105
  },
  {
    icon: "mdi-timer-outline",
    color: "red accent-4",
    description: "Dépassement temps de cycle > 105%",
    show: (counters?.cycleTimePercent || 0) > 105
  }
]

const LayoutData = [
  { cardX: 434, cardY: 441, tagX: 434, tagY: 411 },
  { cardX: 530, cardY: 1000, tagX: 999, tagY: 1254 },
  { cardX: 1181, cardY: 677, tagX: 1181, tagY: 647 },
  { cardX: 1793, cardY: 676, tagX: 1793, tagY: 646 },
  { cardX: 2660, cardY: 130, tagX: 2045, tagY: 263 },
  { cardX: 2566, cardY: 524, tagX: 2566, tagY: 494 },
  { cardX: 3110, cardY: 763, tagX: 3110, tagY: 733 },
  { cardX: 3651, cardY: 780, tagX: 3651, tagY: 750 },
  { cardX: 3854, cardY: 312, tagX: 3854, tagY: 282 },
  { cardX: 3281, cardY: 304, tagX: 3281, tagY: 274 },
  { cardX: 4279, cardY: 551, tagX: 4279, tagY: 521 },
  { cardX: 4353, cardY: 338, tagX: 4353, tagY: 308 },
  { cardX: 4550, cardY: 686, tagX: 4550, tagY: 656 }
]

function machineThumbColor(state: MachineState, darkMode: boolean): string {
  if (state.alarm) return "#d00"
  if (state.alert) return "#d98d00"
  if (state.missingParts || state.saturation) return "url(#hatchPattern)"
  if (state.cycle) return "green"
  return darkMode ? "#999" : "#CCC"
}

export default defineComponent({
  setup() {
    let resizeObs: ResizeObserver

    const opcUaStore = useOpcUaStore()
    const theme = useTheme()

    const cardAnchor = ref<SVGCircleElement[] | null>(null)
    const layoutContainer = ref<HTMLDivElement | null>(null)
    const machineCard = ref<Vue[] | null>(null)

    const cardDOMPositions = ref(
      [...Array(LayoutData.length)].map(() => ({ x: 0, y: 0 }))
    )

    const cardsData = computed<CardData[]>(() => {
      return opcUaStore.state.machinesMetrics
        .map(({ counters }, index) => {
          return {
            index,
            ...cardDOMPositions.value[index],
            icons: cardIcons(counters).filter(
              ({ value, show }) => (value !== undefined && value >= 0) || show
            )
          }
        })
        .filter(({ icons }) => icons.length)
    })

    const layoutData = computed<LayoutMachineData[]>(() => {
      return opcUaStore.state.machinesMetrics.map(({ machineState }, index) => {
        return {
          ...LayoutData[index],
          tagText: machineNames[index],
          thumbFill: machineThumbColor(machineState, theme.value.dark),
          thumbBlink: machineState.alarm
        }
      })
    })

    function placeMachineCards() {
      if (!cardAnchor.value) return
      cardDOMPositions.value = cardAnchor.value.map((anchor, index) => {
        if (!machineCard.value || !layoutContainer.value) {
          return { x: 0, y: 0 }
        }
        const card = machineCard.value.find(
          card =>
            (card.$el as HTMLDivElement).dataset.cardIndex == index.toString()
        )
        if (card === undefined) {
          return { x: 0, y: 0 }
        }
        const anchorRect = anchor.getBoundingClientRect()
        const anchorCenterX = anchorRect.x + anchorRect.width / 2
        const cardRect = card.$el.getBoundingClientRect()
        const containerRect = layoutContainer.value.getBoundingClientRect()
        const x = anchorCenterX - cardRect.width / 2 - containerRect.x
        const y = anchorRect.y + anchorRect.height / 2 - containerRect.y
        return { x, y }
      })
    }

    onMounted(() => {
      resizeObs = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.target === layoutContainer.value) {
            placeMachineCards()
          }
        }
      })
      resizeObs.observe(layoutContainer.value as HTMLDivElement)
      placeMachineCards()
    })

    onBeforeUnmount(() => {
      resizeObs.disconnect()
    })

    watch(cardsData, (val, oldVal) => {
      if (
        val.length !== oldVal.length ||
        val.some(
          (cardData, index) =>
            cardData.icons.length !== oldVal[index].icons.length
        )
      ) {
        nextTick(() => placeMachineCards())
      }
    })

    return {
      cardAnchor,
      layoutContainer,
      machineCard,
      cardIcons,
      cardsData,
      layoutData,
      opcUaState: opcUaStore.state
    }
  }
})
</script>

<style lang="scss" scoped>
@import "~vuetify/src/styles/styles.sass";

@mixin svg-text($material) {
  fill: map-deep-get($material, "text", "primary");
}

.v-application.theme--light {
  svg text {
    @include svg-text($material-light);
  }

  .machine-path {
    stroke: #999;
  }
}

.v-application.theme--dark {
  svg text {
    @include svg-text($material-dark);
  }

  .machine-path {
    stroke: #c8c8c8;
  }

  .gauge ::v-deep .v-progress-circular__underlay {
    stroke: rgba(white, 0.1);
  }
}

.layout-container {
  position: relative;
}

.machine-path {
  stroke-width: 6px;

  &.blink {
    animation: machine-blink 2s step-end infinite;
  }
}

@keyframes machine-blink {
  50% {
    fill-opacity: 0.2;
  }
}

.machine-name {
  font-size: 55px;
  font-weight: 700;
  text-anchor: middle;
  text-transform: uppercase;
}

.machine-card {
  padding: 1px;
  position: absolute;

  .gauge,
  .cycle-time {
    margin: 1px;
  }
}

.cycle-time {
  animation: cycle-time-blink 1s step-end infinite;
}

@keyframes cycle-time-blink {
  50% {
    opacity: 0;
  }
}

.remaining-counter {
  font-size: 70px;
  text-anchor: middle;

  tspan {
    fill: hotpink;
    font-size: 150%;
  }
}
</style>
