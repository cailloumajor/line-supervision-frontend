import { Theme } from "vuetify/types/services/theme"
import {
  inject,
  provide,
  ComputedRef,
  InjectionKey
} from "@vue/composition-api"

const ThemeSymbol: InjectionKey<ComputedRef<Theme>> = Symbol()

export function provideTheme(theme: ComputedRef<Theme>) {
  provide(ThemeSymbol, theme)
}

export function useTheme() {
  const theme = inject(ThemeSymbol)
  if (!theme) {
    throw new Error("Missing theme to inject")
  }
  return theme
}
