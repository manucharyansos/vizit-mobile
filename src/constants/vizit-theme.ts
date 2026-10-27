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
    display: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 },
    pageTitle: { fontSize: 26, lineHeight: 34, fontWeight: '700', letterSpacing: -0.35 },
    sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700', letterSpacing: -0.18 },
    cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
    body: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
    caption: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
    eyebrow: { fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 1.35 },
    button: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
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
    background: '#F7F8F6',
    surface: '#EEF2F0',
    surfaceRaised: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfacePressed: '#E3E9E6',
    text: '#10201D',
    textSecondary: '#43524E',
    muted: '#55635F',
    faint: '#5D6B67',
    border: '#DFE6E3',
    borderStrong: '#CBD5D1',
    divider: '#E8EDEB',
    primary: '#0F766E',
    primaryPressed: '#115E59',
    onPrimary: '#FFFFFF',
    // Large brand surfaces (hero cards): deep teal in both themes.
    cover: '#0F766E',
    coverText: '#FFFFFF',
    coverMuted: '#DFF3EF',
    // Brand mark keeps the same colors in both themes.
    logo: '#0F766E',
    logoInk: '#FFFFFF',
    // Brand emphasis: active tabs, eyebrows, spinners, switches, confirmed states.
    accent: '#0D9488',
    accentText: '#0F766E',
    accentSoft: '#E0F2EF',
    accentSubtle: '#F0F8F6',
    // Warm signature accent, used sparingly: badges, dots, ratings, the logo check.
    highlight: '#F59A3C',
    highlightText: '#9A4A06',
    highlightSoft: '#FDEBD6',
    success: '#3F8F63',
    successSoft: '#E7F3EA',
    warning: '#B98328',
    warningSoft: '#FBF0DC',
    danger: '#B3433F',
    dangerSoft: '#FBEAE8',
    info: '#4C6FA5',
    infoSoft: '#EAEFF6',
    shadow: '#10201D',
    scrim: 'rgba(16, 32, 29, 0.5)',
    map: '#E8EEEB',

    // Compatibility aliases used by existing feature screens.
    cream: '#EEF2F0',
    peach: '#FDEBD6',
    peachSoft: '#FEF5EA',
    plum: '#0F766E',
    plumStrong: '#134E4A',
    plumSoft: '#E0F2EF',
    gold: '#F59A3C',
    goldSoft: '#FDEBD6',
  },
  dark: {
    ...shared,
    background: '#0D1513',
    surface: '#111A18',
    surfaceRaised: '#15201D',
    surfaceElevated: '#1C2925',
    surfacePressed: '#22302C',
    text: '#ECF3F1',
    textSecondary: '#C4D1CD',
    muted: '#94A7A2',
    faint: '#8FA29D',
    border: '#23302D',
    borderStrong: '#2F3E3A',
    divider: '#1E2A27',
    primary: '#2DD4BF',
    primaryPressed: '#14B8A6',
    onPrimary: '#04201B',
    cover: '#134E4A',
    coverText: '#ECF3F1',
    coverMuted: '#BFE6DF',
    logo: '#0F766E',
    logoInk: '#FFFFFF',
    accent: '#2DD4BF',
    accentText: '#5EEAD4',
    accentSoft: 'rgba(45, 212, 191, 0.14)',
    accentSubtle: 'rgba(45, 212, 191, 0.07)',
    highlight: '#FFAE5C',
    highlightText: '#FFB870',
    highlightSoft: 'rgba(255, 174, 92, 0.16)',
    success: '#5FBE95',
    successSoft: 'rgba(95, 190, 149, 0.16)',
    warning: '#D7AD5E',
    warningSoft: 'rgba(215, 173, 94, 0.16)',
    danger: '#E28783',
    dangerSoft: 'rgba(226, 135, 131, 0.16)',
    info: '#7FA3D1',
    infoSoft: 'rgba(127, 163, 209, 0.16)',
    shadow: '#000000',
    scrim: 'rgba(0, 0, 0, 0.68)',
    map: '#16211E',

    // Compatibility aliases used by existing feature screens.
    cream: '#15201D',
    peach: '#2E241A',
    peachSoft: 'rgba(255, 174, 92, 0.08)',
    plum: '#2DD4BF',
    plumStrong: '#5EEAD4',
    plumSoft: 'rgba(45, 212, 191, 0.14)',
    gold: '#FFAE5C',
    goldSoft: 'rgba(255, 174, 92, 0.16)',
  },
} as const;

export type ThemeMode = keyof typeof themes;
export type VizitTheme = (typeof themes)[ThemeMode];
