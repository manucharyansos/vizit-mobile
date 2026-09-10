const shared = {
  radius: { small: 8, medium: 10, large: 16, pill: 999 },
  spacing: { xs: 6, sm: 10, md: 16, lg: 22, xl: 30 },
} as const;

export const themes = {
  light: {
    ...shared, background: '#FFFFFF', surface: '#F7F7F8', surfaceRaised: '#FFFFFF', cream: '#F3F4F6', peach: '#E5E7EB', peachSoft: '#F3F4F6',
    plum: '#6B7280', plumStrong: '#374151', plumSoft: '#F3F4F6', gold: '#6B7280', goldSoft: '#F3F4F6', text: '#111827', muted: '#6B7280',
    border: '#E5E7EB', map: '#F3F4F6', danger: '#C84252', dangerSoft: '#FCEDEF', success: '#18745A', successSoft: '#ECFDF5', shadow: '#111827',
  },
  dark: {
    ...shared, background: '#111315', surface: '#1A1D21', surfaceRaised: '#16191D', cream: '#22262B', peach: '#343A40', peachSoft: '#202429',
    plum: '#9CA3AF', plumStrong: '#F3F4F6', plumSoft: '#2A2E34', gold: '#B4BAC4', goldSoft: '#2A2E34', text: '#F5F5F5', muted: '#9CA3AF',
    border: '#343A40', map: '#20242A', danger: '#FF8291', dangerSoft: '#3D1E2A', success: '#68D2AA', successSoft: '#143329', shadow: '#000000',
  },
} as const;
export type ThemeMode = keyof typeof themes;
export type VizitTheme = (typeof themes)[ThemeMode];
