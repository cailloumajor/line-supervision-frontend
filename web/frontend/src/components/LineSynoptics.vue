<template>
  <div class="layout-container" ref="layoutContainer">
    <v-row align="center" justify="space-around" no-gutters>
      <v-col
        v-for="(icon, name) in cardIcons()"
        :key="`legend-icon-${name}`"
        md="auto"
      >
        <v-progress-circular
          v-if="icon.show === undefined"
          :color="icon.color"
          :rotate="-90"
          :size="responsiveDimensions.legendGaugeSize"
          :value="80"
          :width="responsiveDimensions.legendGaugeWidth"
          class="gauge"
        >
          <v-icon :size="responsiveDimensions.legendIconSize">
            {{ icon.icon }}
          </v-icon>
        </v-progress-circular>
        <v-icon
          v-else
          :color="icon.color"
          :size="responsiveDimensions.legendGaugeSize"
        >
          {{ icon.icon }}
        </v-icon>
        {{ icon.description }}
      </v-col>
    </v-row>
    <svg ref="layoutSvg" :viewBox="svgViewBox">
      <defs>
        <pattern
          v-for="pat in hatches"
          :key="pat.id"
          :id="pat.id"
          width="40"
          height="10"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect :fill="pat.secondary" width="100%" height="100%" />
          <line :stroke="pat.primary" x2="0" y2="100%" stroke-width="50" />
        </pattern>
      </defs>
      <g v-for="machine in layoutData" :key="`machine-${machine.index}`">
        <title>{{ `Machine ${machine.index}` }}</title>
        <path
          :class="{ blink: machine.thumbBlink }"
          :d="machine.path"
          :fill="machine.thumbFill"
          class="machine-path"
        />
        <text :x="machine.tagPos.x" :y="machine.tagPos.y" class="machine-name">
          {{ machine.name }}
        </text>
        <circle
          :cx="machine.cardPos.x"
          :cy="machine.cardPos.y"
          r="10"
          ref="cardAnchor"
          visibility="hidden"
        />
      </g>
      <g transform="translate(2300, 930)">
        <g
          v-for="(shape, key, index) in thumbFillPalette"
          :key="`legend-shape-${index}`"
          :transform="`translate(0 ${75 * index})`"
        >
          <rect :fill="shape.fill" width="100" height="50" />
          <text x="120" y="45" font-size="55">
            {{ shape.description }}
          </text>
        </g>
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
          :size="responsiveDimensions.gaugeSize"
          :value="icon.value"
          :width="responsiveDimensions.gaugeWidth"
          class="gauge"
        >
          <v-icon :size="responsiveDimensions.iconSize">{{ icon.icon }}</v-icon>
        </v-progress-circular>
        <v-icon
          v-if="icon.show"
          :key="`machine-card-${cardIndex}-icon-${iconIndex}`"
          :color="icon.color"
          :size="responsiveDimensions.gaugeSize"
          class="cycle-time"
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
  reactive,
  ref,
  watch,
} from "@vue/composition-api"
import { useResizeObserver } from "@vueuse/core"
import kebabCase from "lodash/kebabCase"
import mapValues from "lodash/mapValues"
import Vue from "vue"

import { statePalette, MachineStateShape, ShapeID } from "@/common"
import useResponsiveness from "@/composables/responsiveness"
import { useTheme } from "@/composables/theme"
import useOpcUaStore from "@/stores/opcua"
import useUiConfigStore from "@/stores/ui-config"
import { MachineCounters, MachineState } from "@/stores/types"

interface CardIcon {
  icon: string
  color: string
  description: string
  value?: number
  show?: boolean
}

const cardIcons = (counters?: MachineCounters): CardIcon[] => [
  {
    icon: "mdi-eye-check",
    color: "orange darken-3",
    description: "Contrôle fréquentiel",
    value: counters?.partControlPercent,
  },
  {
    icon: "mdi-tools",
    color: "blue darken-1",
    description: "Contrôle ou changement d'outils",
    value: counters?.toolChangePercent,
  },
  {
    icon: "mdi-robot-industrial",
    color: "purple darken-1",
    description: "Remplissage stockeur robot",
    value: counters?.bufferFillPercent,
  },
  {
    icon: "mdi-timer-outline",
    color: "orange",
    description: "Dépassement temps de cycle ≤ 105%",
    show:
      (counters?.cycleTimePercent || 0) > 100 &&
      (counters?.cycleTimePercent || 0) <= 105,
  },
  {
    icon: "mdi-timer-outline",
    color: "red accent-4",
    description: "Dépassement temps de cycle > 105%",
    show: (counters?.cycleTimePercent || 0) > 105,
  },
]

function hatchID(key: string): string {
  return `hatch-${kebabCase(key)}`
}

function fillShape(state: MachineState): ShapeID {
  if (state.alarm) return "alarm"
  if (state.cycle) {
    if (state.alert) return "alertInCycle"
    if (state.missingParts || state.saturation) return "interruptedFlow"
    return "cycle"
  }
  if (state.alert) return "alert"
  return "outOfProduction"
}

export default defineComponent({
  setup() {
    const opcUaStore = useOpcUaStore()
    const uiConfig = useUiConfigStore()
    const theme = useTheme()

    const svgViewBox = (() => {
      const { height, width } = uiConfig.config.synoptics.viewbox
      return `0 0 ${width} ${height}`
    })()

    const cardAnchor = ref<SVGCircleElement[] | null>(null)
    const layoutContainer = ref<HTMLDivElement | null>(null)
    const layoutSvg = ref<SVGSVGElement | null>(null)
    const machineCard = ref<Vue[] | null>(null)

    const cardDOMPositions = ref(
      [...Array(uiConfig.machines.length)].map(() => ({ x: 0, y: 0 }))
    )

    const responsiveDimensions = reactive({
      gaugeSize: 32,
      gaugeWidth: 5,
      iconSize: 16,
      legendGaugeSize: 32,
      legendGaugeWidth: 5,
      legendIconSize: 16,
    })

    const thumbFillPalette = computed(() =>
      mapValues(
        statePalette,
        ({ description, primaryColor, secondaryColor }, key) => {
          const fill =
            secondaryColor === undefined
              ? primaryColor(theme.value.dark)
              : `url(#${hatchID(key)})`
          return {
            description,
            fill,
          }
        }
      )
    )

    const hatches = computed(() =>
      Object.entries(statePalette)
        .filter((entry): entry is [string, Required<MachineStateShape>] => {
          const [, { secondaryColor }] = entry
          return secondaryColor !== undefined
        })
        .map(([key, { primaryColor, secondaryColor }]) => ({
          id: hatchID(key),
          primary: primaryColor(theme.value.dark),
          secondary: secondaryColor(theme.value.dark),
        }))
    )

    const cardsData = computed(() => {
      return opcUaStore.machinesWithUiConfig
        .map(({ counters }, index) => {
          return {
            index,
            ...cardDOMPositions.value[index],
            icons: cardIcons(counters).filter(
              ({ value, show }) => (value !== undefined && value >= 0) || show
            ),
          }
        })
        .filter(({ icons }) => icons.length)
    })

    const layoutData = computed(() =>
      opcUaStore.machinesWithUiConfig.map(({ machineState }, index) => ({
        ...uiConfig.machines[index],
        thumbFill: thumbFillPalette.value[fillShape(machineState)].fill,
        thumbBlink: machineState.alarm,
      }))
    )

    function placeMachineCards() {
      if (!cardAnchor.value) return
      cardDOMPositions.value = cardAnchor.value.map((anchor, index) => {
        if (!machineCard.value || !layoutContainer.value) {
          return { x: 0, y: 0 }
        }
        const card = machineCard.value.find(
          (card) =>
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

    const { isProdLineScreen } = useResponsiveness()
    function resizeMachineCardsContent() {
      const bbox = layoutSvg.value?.getBoundingClientRect()
      if (bbox === undefined) return
      let size = bbox.height / 11.9
      if (isProdLineScreen) {
        size *= 1.2
      }
      responsiveDimensions.gaugeSize = size
      responsiveDimensions.gaugeWidth = size / 6.4
      responsiveDimensions.iconSize = size / 2
      const legendRatio = 0.7
      const { gaugeSize, gaugeWidth, iconSize } = responsiveDimensions
      responsiveDimensions.legendGaugeSize = gaugeSize * legendRatio
      responsiveDimensions.legendGaugeWidth = gaugeWidth * legendRatio
      responsiveDimensions.legendIconSize = iconSize * legendRatio
    }

    useResizeObserver(layoutContainer, (entries) => {
      for (const entry of entries) {
        if (entry.target === layoutContainer.value) {
          placeMachineCards()
          resizeMachineCardsContent()
        }
      }
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
      cardIcons,
      cardsData,
      responsiveDimensions,
      hatches,
      layoutContainer,
      layoutData,
      layoutSvg,
      machineCard,
      opcUaState: opcUaStore.$state,
      svgViewBox,
      thumbFillPalette,
    }
  },
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
  padding: 0.2vh;
  position: absolute;

  .gauge,
  .cycle-time {
    margin: 0.2vh;
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
