export type ThemeRadius = "default" | "none" | "sm" | "md" | "lg" | "xl";
export type ThemePreset = "default" | "ocean-breeze";
export type ThemeScale = "none" | "xs" | "lg";
export type ThemeContentLayout = "default" | "full" | "centered";

export type ThemeType = {
  radius: ThemeRadius;
  preset: ThemePreset;
  scale: ThemeScale;
  contentLayout: ThemeContentLayout;
};

export const DEFAULT_THEME: ThemeType = {
  preset: "ocean-breeze",
  radius: "sm",
  scale: "none",
  contentLayout: "full",
}
