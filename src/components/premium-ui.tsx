import { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { VizitIcon } from '@/components/vizit-icon';

type IconProps = React.ComponentProps<typeof VizitIcon>;

export function BrandLockup({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  const { theme } = useApp();
  const foreground = inverse ? theme.onPrimary : theme.text;
  const markBackground = inverse ? 'rgba(255,255,255,0.13)' : theme.primary;
  return (
    <View style={styles.brandRow}>
      <View style={[styles.brandMark, compact && styles.brandMarkCompact, { backgroundColor: markBackground }]}>
        <VizitIcon ios="calendar.badge.checkmark" android="event_available" color={theme.onPrimary} size={compact ? 20 : 24} />
      </View>
      <Text style={[styles.brandText, compact && styles.brandTextCompact, { color: foreground }]}>Vizit</Text>
    </View>
  );
}

export function Surface({ children, style, elevated = false }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; elevated?: boolean }>) {
  const { theme } = useApp();
  return (
    <View
      style={[
        styles.surface,
        ui.shadow.card,
        { backgroundColor: elevated ? theme.surfaceElevated : theme.surfaceRaised, borderColor: theme.border, shadowColor: theme.shadow },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function IconButton({
  ios,
  android,
  accessibilityLabel,
  onPress,
  tone = 'neutral',
  size = ui.touchTarget,
  disabled = false,
  style,
}: Pick<IconProps, 'ios' | 'android'> & {
  accessibilityLabel: string;
  onPress: () => void;
  tone?: 'neutral' | 'accent' | 'primary' | 'danger';
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useApp();
  const background = tone === 'primary' ? theme.primary : tone === 'accent' ? theme.accentSoft : tone === 'danger' ? theme.dangerSoft : theme.surfaceRaised;
  const foreground = tone === 'primary' ? theme.onPrimary : tone === 'accent' ? theme.accentText : tone === 'danger' ? theme.danger : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: Math.min(size / 2, ui.radius.medium), backgroundColor: background, borderColor: tone === 'neutral' ? theme.border : background, opacity: disabled ? 0.42 : pressed ? 0.72 : 1 },
        style,
      ]}
    >
      <VizitIcon ios={ios} android={android} color={foreground} size={20} />
    </Pressable>
  );
}

export function PageHeader({
  title,
  eyebrow,
  subtitle,
  backLabel,
  onBack,
  action,
  style,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  backLabel?: string;
  onBack?: () => void;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useApp();
  return (
    <View style={[styles.pageHeader, style]}>
      {onBack ? <IconButton ios="chevron.left" android="chevron_left" accessibilityLabel={backLabel ?? title} onPress={onBack} /> : null}
      <View style={styles.pageHeaderText}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: theme.accentText }]}>{eyebrow.toLocaleUpperCase()}</Text> : null}
        <Text style={[styles.pageTitle, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.pageSubtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.headerAction}>{action}</View> : null}
    </View>
  );
}

export function SectionHeader({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  const { theme } = useApp();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        {detail ? <Text style={[styles.sectionDetail, { color: theme.muted }]}>{detail}</Text> : null}
      </View>
      {action}
    </View>
  );
}

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';

export function PremiumButton({
  title,
  onPress,
  tone = 'primary',
  icon,
  loading = false,
  disabled = false,
  compact = false,
  style,
  textStyle,
}: {
  title: string;
  onPress: () => void;
  tone?: ButtonTone;
  icon?: Pick<IconProps, 'ios' | 'android'>;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { theme } = useApp();
  const isDisabled = disabled || loading;
  const background = tone === 'primary' ? theme.primary : tone === 'danger' ? theme.dangerSoft : tone === 'secondary' ? theme.surfaceRaised : 'transparent';
  const foreground = tone === 'primary' ? theme.onPrimary : tone === 'danger' ? theme.danger : tone === 'secondary' ? theme.text : theme.accentText;
  const border = tone === 'primary' ? theme.primary : tone === 'danger' ? theme.danger : tone === 'secondary' ? theme.borderStrong : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: background, borderColor: border, opacity: isDisabled ? 0.42 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={foreground} /> : null}
      {!loading && icon ? <VizitIcon ios={icon.ios} android={icon.android} color={foreground} size={18} /> : null}
      {!loading ? <Text style={[styles.buttonText, { color: foreground }, textStyle]}>{title}</Text> : null}
    </Pressable>
  );
}

export function PremiumInput({
  label,
  icon,
  error,
  containerStyle,
  inputStyle,
  ...props
}: TextInputProps & {
  label?: string;
  icon?: Pick<IconProps, 'ios' | 'android'>;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}) {
  const { theme } = useApp();
  return (
    <View style={[styles.fieldGroup, containerStyle]}>
      {label ? <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text> : null}
      <View style={[styles.fieldShell, props.multiline && styles.fieldShellMultiline, { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border }]}>
        {icon ? <VizitIcon ios={icon.ios} android={icon.android} color={theme.faint} size={19} style={props.multiline ? styles.fieldIconMultiline : undefined} /> : null}
        <TextInput
          {...props}
          placeholderTextColor={theme.faint}
          selectionColor={theme.accent}
          style={[styles.field, props.multiline && styles.fieldMultiline, { color: theme.text }, inputStyle]}
        />
      </View>
      {error ? <Text style={[styles.fieldError, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
}

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' }) {
  const { theme } = useApp();
  const background = tone === 'success' ? theme.successSoft : tone === 'warning' ? theme.warningSoft : tone === 'danger' ? theme.dangerSoft : tone === 'accent' ? theme.accentSoft : theme.surface;
  const foreground = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : tone === 'danger' ? theme.danger : tone === 'accent' ? theme.accentText : theme.muted;
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <View style={[styles.pillDot, { backgroundColor: foreground }]} />
      <Text numberOfLines={1} style={[styles.pillText, { color: foreground }]}>{label}</Text>
    </View>
  );
}

export function StateCard({
  title,
  message,
  icon = { ios: 'tray', android: 'inbox' },
  tone = 'neutral',
  action,
}: {
  title: string;
  message?: string;
  icon?: Pick<IconProps, 'ios' | 'android'>;
  tone?: 'neutral' | 'danger';
  action?: ReactNode;
}) {
  const { theme } = useApp();
  const color = tone === 'danger' ? theme.danger : theme.accentText;
  const background = tone === 'danger' ? theme.dangerSoft : theme.accentSubtle;
  return (
    <Surface style={styles.stateCard}>
      <View style={[styles.stateIcon, { backgroundColor: background }]}>
        <VizitIcon ios={icon.ios} android={icon.android} color={color} size={25} />
      </View>
      <Text style={[styles.stateTitle, { color: theme.text }]}>{title}</Text>
      {message ? <Text style={[styles.stateMessage, { color: theme.muted }]}>{message}</Text> : null}
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </Surface>
  );
}

export function Divider() {
  const { theme } = useApp();
  return <View style={[styles.divider, { backgroundColor: theme.divider }]} />;
}

export function PreferenceBar({ languageLabel, themeLabel }: { languageLabel: string; themeLabel: string }) {
  const { locale, mode, setLocale, theme, toggleMode } = useApp();
  const locales = ['hy', 'ru', 'en'] as const;
  return (
    <View style={[styles.preferenceBar, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, shadowColor: theme.shadow }]}>
      <View accessibilityLabel={languageLabel} style={[styles.localeGroup, { backgroundColor: theme.surface }]}>
        {locales.map((item) => {
          const selected = item === locale;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`${languageLabel}: ${item.toUpperCase()}`}
              accessibilityState={{ selected }}
              onPress={() => setLocale(item)}
              style={({ pressed }) => [styles.localeOption, { backgroundColor: selected ? theme.primary : 'transparent', opacity: pressed ? 0.72 : 1 }]}
            >
              <Text style={[styles.localeText, { color: selected ? theme.onPrimary : theme.muted }]}>{item.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>
      <IconButton
        ios={mode === 'dark' ? 'sun.max.fill' : 'moon.fill'}
        android={mode === 'dark' ? 'light_mode' : 'dark_mode'}
        accessibilityLabel={themeLabel}
        onPress={toggleMode}
        tone="accent"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  brandMarkCompact: { width: 38, height: 38, borderRadius: 12 },
  brandText: { fontSize: 26, lineHeight: 30, fontWeight: '800', letterSpacing: -0.8 },
  brandTextCompact: { fontSize: 22, lineHeight: 26 },
  surface: { borderWidth: 1, borderRadius: ui.radius.large, padding: ui.spacing.md },
  iconButton: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: ui.spacing.sm },
  pageHeaderText: { flex: 1, minHeight: ui.touchTarget, justifyContent: 'center' },
  eyebrow: ui.type.eyebrow,
  pageTitle: ui.type.pageTitle,
  pageSubtitle: { ...ui.type.body, marginTop: ui.spacing.xxs },
  headerAction: { flexDirection: 'row', gap: ui.spacing.xs },
  sectionHeader: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ui.spacing.sm },
  sectionHeaderText: { flex: 1 },
  sectionTitle: ui.type.sectionTitle,
  sectionDetail: { ...ui.type.caption, marginTop: 2 },
  button: { minHeight: ui.controlHeight, borderRadius: ui.radius.medium, borderWidth: 1, paddingHorizontal: ui.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ui.spacing.xs },
  buttonCompact: { minHeight: 42, borderRadius: ui.radius.small, paddingHorizontal: ui.spacing.sm },
  buttonText: ui.type.button,
  fieldGroup: { gap: 7 },
  fieldLabel: { ...ui.type.caption, marginLeft: 2 },
  fieldShell: { minHeight: ui.controlHeight, borderWidth: 1, borderRadius: ui.radius.medium, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldShellMultiline: { minHeight: 96, alignItems: 'flex-start', paddingTop: 15 },
  field: { flex: 1, minHeight: 48, paddingVertical: 0, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  fieldMultiline: { minHeight: 76, paddingTop: 0, textAlignVertical: 'top' },
  fieldIconMultiline: { marginTop: 2 },
  fieldError: { ...ui.type.caption, marginLeft: 2 },
  pill: { maxWidth: '100%', minHeight: 28, borderRadius: ui.radius.pill, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, lineHeight: 14, fontWeight: '800' },
  stateCard: { minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: ui.spacing.xl },
  stateIcon: { width: 50, height: 50, borderRadius: ui.radius.medium, alignItems: 'center', justifyContent: 'center', marginBottom: ui.spacing.sm },
  stateTitle: { ...ui.type.cardTitle, textAlign: 'center' },
  stateMessage: { ...ui.type.body, textAlign: 'center', marginTop: ui.spacing.xs },
  stateAction: { alignSelf: 'stretch', marginTop: ui.spacing.md },
  divider: { height: StyleSheet.hairlineWidth, width: '100%' },
  preferenceBar: { minHeight: 58, borderWidth: 1, borderRadius: ui.radius.large, padding: 6, paddingLeft: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ui.spacing.sm, ...ui.shadow.card },
  localeGroup: { flex: 1, minHeight: 44, borderRadius: ui.radius.medium, padding: 3, flexDirection: 'row' },
  localeOption: { flex: 1, minWidth: 48, borderRadius: ui.radius.small, alignItems: 'center', justifyContent: 'center' },
  localeText: { fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 0.75 },
});
