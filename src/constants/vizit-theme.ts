/**
 * Vizit visual foundations.
 *
 * Keep semantic colors here and consume them through `useApp()`. The legacy
 * names (`plum`, `gold`, `cream`…) remain as compatibility aliases while the
 * screens migrate to the clearer semantic names.
 */
export const ui = {
  radius: {
    xs: 8,
    small: 12,
    medium: 16,
    large: 22,
    xlarge: 28,
    pill: 999,
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 40,
  },
  icon: {
    small: 16,
    medium: 20,
    large: 24,
  },
  type: {
    display: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8 },
    pageTitle: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.55 },
    sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '800', letterSpacing: -0.18 },
    cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800' },
    body: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
    caption: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
    eyebrow: { fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 1.35 },
    button: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
  },
  shadow: {
    card: {
      shadowOpacity: 0.055,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 7 },
      elevation: 2,
    },
    floating: {
      shadowOpacity: 0.14,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  },
  screenGutter: 20,
  controlHeight: 52,
  touchTarget: 44,
} as const;

const shared = {
  radius: ui.radius,
  spacing: ui.spacing,
} as const;

export const themes = {
  light: {
    ...shared,
    background: '#F4F5F4',
    surface: '#ECEFEE',
    surfaceRaised: '#FCFDFC',
    surfaceElevated: '#FFFFFF',
    surfacePressed: '#E5E9E8',
    text: '#15191C',
    textSecondary: '#4E5961',
    muted: '#5D6971',
    faint: '#636E75',
    border: '#D9DEDD',
    borderStrong: '#C7CECD',
    divider: '#E3E7E6',
    primary: '#24343D',
    primaryPressed: '#18262E',
    onPrimary: '#FFFFFF',
    accent: '#527184',
    accentText: '#3E6277',
    accentSoft: '#E3EAED',
    accentSubtle: '#EEF2F3',
    success: '#2D735E',
    successSoft: '#E4F0EB',
    warning: '#8A642E',
    warningSoft: '#F4ECDD',
    danger: '#A74752',
    dangerSoft: '#F6E6E8',
    info: '#527184',
    infoSoft: '#E3EAED',
    shadow: '#11191E',
    scrim: 'rgba(13, 18, 22, 0.52)',
    map: '#E8ECEB',

    // Compatibility aliases used by existing feature screens.
    cream: '#E8ECEB',
    peach: '#DCE3E5',
    peachSoft: '#EEF2F3',
    plum: '#3F6175',
    plumStrong: '#24343D',
    plumSoft: '#E3EAED',
    gold: '#687983',
    goldSoft: '#EDF0EF',
  },
  dark: {
    ...shared,
    background: '#0C0F11',
    surface: '#14191D',
    surfaceRaised: '#191F23',
    surfaceElevated: '#20272C',
    surfacePressed: '#252D33',
    text: '#F3F5F5',
    textSecondary: '#C1C8CC',
    muted: '#98A2A9',
    faint: '#717D85',
    border: '#293138',
    borderStrong: '#39434B',
    divider: '#242B31',
    primary: '#D9E2E6',
    primaryPressed: '#BFCED5',
    onPrimary: '#11171B',
    accent: '#86A1B0',
    accentText: '#9CB4C1',
    accentSoft: '#1C2A31',
    accentSubtle: '#172127',
    success: '#70B59C',
    successSoft: '#172D26',
    warning: '#D0A966',
    warningSoft: '#332919',
    danger: '#E4868F',
    dangerSoft: '#351E23',
    info: '#8BA8B8',
    infoSoft: '#1C2A31',
    shadow: '#000000',
    scrim: 'rgba(0, 0, 0, 0.68)',
    map: '#151C20',

    // Compatibility aliases used by existing feature screens.
    cream: '#20272C',
    peach: '#2A343A',
    peachSoft: '#172127',
    plum: '#54768A',
    plumStrong: '#E4EBEE',
    plumSoft: '#1C2A31',
    gold: '#A7B2B8',
    goldSoft: '#242B2F',
  },
} as const;

export type ThemeMode = keyof typeof themes;
export type VizitTheme = (typeof themes)[ThemeMode];
