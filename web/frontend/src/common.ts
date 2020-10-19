type ThemeableColor = (darkMode: boolean) => string

export type ShapeID =
  | "outOfProduction"
  | "cycle"
  | "alert"
  | "alarm"
  | "alertInCycle"
  | "interruptedFlow"

export interface MachineStateShape {
  description: string
  primaryColor: ThemeableColor
  secondaryColor?: ThemeableColor
}

const themedGrey: ThemeableColor = dark => (dark ? "#999" : "#CCC")
const cycleColor = "#080"
const alertColor = "#d98d00"

export const statePalette: Record<ShapeID, MachineStateShape> = {
  outOfProduction: {
    description: "Hors production",
    primaryColor: themedGrey
  },
  cycle: {
    description: "En cycle",
    primaryColor: () => cycleColor
  },
  alert: {
    description: "Arrêt avec avertissement",
    primaryColor: () => alertColor
  },
  alarm: {
    description: "Arrêt en défaut",
    primaryColor: () => "#d00"
  },
  alertInCycle: {
    description: "En cycle avec avertissement",
    primaryColor: () => cycleColor,
    secondaryColor: () => alertColor
  },
  interruptedFlow: {
    description: "Manque pièces ou saturation",
    primaryColor: () => cycleColor,
    secondaryColor: themedGrey
  }
}
