const shared = {
  radius: { small: 8, medium: 10, large: 16, pill: 999 },
  spacing: { xs: 6, sm: 10, md: 16, lg: 22, xl: 30 },
} as const;

export const themes = {
  light: {
    ...shared, background: '#FFFFFF', surface: '#F4F8FB', surfaceRaised: '#FFFFFF', cream: '#EDF4F8', peach: '#D8ECFC', peachSoft: '#EEF7FE',
    plum: '#237CC5', plumStrong: '#092B46', plumSoft: '#E5F2FD', gold: '#378ADD', goldSoft: '#EAF5FE', text: '#071624', muted: '#58758D',
    border: '#D5E3EE', map: '#E9F3FA', danger: '#C84252', dangerSoft: '#FCEDEF', success: '#18745A', shadow: '#071624',
  },
  dark: {
    ...shared, background: '#071624', surface: '#0E2940', surfaceRaised: '#0B2133', cream: '#102D45', peach: '#174A70', peachSoft: '#0F2D45',
    plum: '#378ADD', plumStrong: '#E5F3FF', plumSoft: '#123653', gold: '#7DBCF4', goldSoft: '#123653', text: '#F3F8FD', muted: '#7390AA',
    border: '#173B57', map: '#102D45', danger: '#FF8291', dangerSoft: '#3D1E2A', success: '#68D2AA', shadow: '#020B12',
  },
} as const;
export type ThemeMode = keyof typeof themes;
export type VizitTheme = (typeof themes)[ThemeMode];
