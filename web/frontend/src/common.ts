interface MachineStateShape {
  description: string
  color: (darkMode: boolean) => string
}

export const stateShapes: MachineStateShape[] = [
  {
    description: "Hors production",
    color: darkMode => (darkMode ? "#999" : "#CCC")
  },
  { description: "En cycle", color: () => "#080" },
  { description: "Alerte", color: () => "#d98d00" },
  { description: "Défaut", color: () => "#d00" }
]
