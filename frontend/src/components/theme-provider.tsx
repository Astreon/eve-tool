import React, { type PropsWithChildren } from "react"
import {
  ThemeProvider as BaseThemeProvider,
  type ThemeProviderProps as BaseThemeProviderProps,
} from 'tanstack-theme-kit'

export type AppThemeProviderProps = PropsWithChildren<BaseThemeProviderProps>

export const AppThemeProvider: React.FC<AppThemeProviderProps> = ({
  children,
  ...props
}) => {
  return <BaseThemeProvider {...props}>{children}</BaseThemeProvider>
}

export { useTheme } from "tanstack-theme-kit"