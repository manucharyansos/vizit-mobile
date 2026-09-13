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
    background: '#FAF9F5',
    surface: '#F1EEE5',
    surfaceRaised: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfacePressed: '#ECE8DD',
    text: '#1C1B18',
    textSecondary: '#5C574C',
    muted: '#6B675E',
    faint: '#6D6A61',
    border: '#E8E4D9',
    borderStrong: '#D9D4C5',
    divider: '#EEEAE0',
    primary: '#1F6D5A',
    primaryPressed: '#175945',
    onPrimary: '#FFFFFF',
    accent: '#C9A15A',
    accentText: '#8A6A2E',
    accentSoft: '#F6ECDA',
    accentSubtle: '#FAF4E9',
    success: '#3F8F63',
    successSoft: '#E7F3EA',
    warning: '#B98328',
    warningSoft: '#FBF0DC',
    danger: '#B3433F',
    dangerSoft: '#FBEAE8',
    info: '#4C6FA5',
    infoSoft: '#EAEFF6',
    shadow: '#1C1B18',
    scrim: 'rgba(28, 27, 24, 0.5)',
    map: '#EFEBE0',

    // Compatibility aliases used by existing feature screens.
    cream: '#F3EFE4',
    peach: '#F0E4D3',
    peachSoft: '#FAF3E7',
    plum: '#1F6D5A',
    plumStrong: '#154A3D',
    plumSoft: '#E7F1EC',
    gold: '#C9A15A',
    goldSoft: '#F6ECDA',
  },
  dark: {
    ...shared,
    background: '#18191A',
    surface: '#202123',
    surfaceRaised: '#242527',
    surfaceElevated: '#2B2C2F',
    surfacePressed: '#323335',
    text: '#F2F0EA',
    textSecondary: '#C7C3B8',
    muted: '#9C988D',
    faint: '#9C9992',
    border: '#333335',
    borderStrong: '#3F4042',
    divider: '#2C2D2F',
    primary: '#EFE9DC',
    primaryPressed: '#DCD5C4',
    onPrimary: '#1C1B18',
    accent: '#49B08D',
    accentText: '#6BC7A4',
    accentSoft: 'rgba(73, 176, 141, 0.16)',
    accentSubtle: 'rgba(73, 176, 141, 0.08)',
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
    map: '#1D1E20',

    // Compatibility aliases used by existing feature screens.
    cream: '#242527',
    peach: '#2E2B26',
    peachSoft: 'rgba(215, 173, 94, 0.08)',
    plum: '#49B08D',
    plumStrong: '#EFE9DC',
    plumSoft: 'rgba(73, 176, 141, 0.16)',
    gold: '#D7AD5E',
    goldSoft: 'rgba(215, 173, 94, 0.16)',
  },
} as const;

export type ThemeMode = keyof typeof themes;
export type VizitTheme = (typeof themes)[ThemeMode];
