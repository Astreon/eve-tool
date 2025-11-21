export const DEFAULT_THEME = {
  preset: "ocean-breeze",
  radius: "sm",
  scale: "none",
  contentLayout: "full",
} as const;

export type ThemeType = typeof DEFAULT_THEME;