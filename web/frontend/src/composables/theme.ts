import type { ComputedRef, InjectionKey } from "@vue/composition-api"
import type { Theme } from "vuetify/types/services/theme"

import { inject, provide } from "@vue/composition-api"

const ThemeSymbol: InjectionKey<ComputedRef<Theme>> = Symbol()

export function provideTheme(theme: ComputedRef<Theme>): void {
  provide(ThemeSymbol, theme)
}

export function useTheme(): ComputedRef<Theme> {
  const theme = inject(ThemeSymbol)
  if (!theme) {
    throw new Error("Missing theme to inject")
  }
  return theme
}
