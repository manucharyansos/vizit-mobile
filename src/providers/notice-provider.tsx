import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';

type NoticeTone = 'success' | 'error' | 'info';
type NoticeInput = {
  title: string;
  message?: string;
  tone?: NoticeTone;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
};
type NoticeState = NoticeInput & { id: number; tone: NoticeTone; duration: number };
type NoticeContextValue = {
  showNotice: (notice: NoticeInput) => void;
  hideNotice: () => void;
};

const NoticeContext = createContext<NoticeContextValue | null>(null);

function inferTone(title: string, message?: string): NoticeTone {
  const value = `${title} ${message ?? ''}`.toLocaleLowerCase();
  if (/չհաջող|սխալ|error|failed|could not|не удалось|ошиб/.test(value)) return 'error';
  if (/հաջող|պահպան|ստեղծ|success|saved|created|успеш|сохран|создан/.test(value)) return 'success';
  return 'info';
}

export function NoticeProvider({ children }: PropsWithChildren) {
  const { locale, theme } = useApp();
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const hideNotice = useCallback(() => setNotice(null), []);
  const showNotice = useCallback((input: NoticeInput) => {
    const tone = input.tone ?? inferTone(input.title, input.message);
    setNotice({
      ...input,
      id: Date.now(),
      tone,
      duration: input.duration ?? (input.actionLabel ? 0 : tone === 'error' ? 5200 : 3800),
    });
  }, []);

  useEffect(() => {
    if (!notice || notice.duration <= 0) return;
    const timer = setTimeout(hideNotice, notice.duration);
    return () => clearTimeout(timer);
  }, [hideNotice, notice]);

  useEffect(() => {
    const nativeAlert = Alert.alert;
    const patchedAlert: typeof Alert.alert = (title, message, buttons, options) => {
      if ((buttons?.length ?? 0) > 1) {
        nativeAlert(title, message, buttons, options);
        return;
      }

      const onlyButton = buttons?.[0];
      let friendlyMessage = message;
      if (friendlyMessage && /(field must match the format|SQLSTATE|stack trace)/i.test(friendlyMessage)) {
        friendlyMessage = {
          hy: 'Խնդրում ենք նորից փորձել։ Եթե խնդիրը կրկնվի, թարմացրեք էջը։',
          ru: 'Попробуйте ещё раз. Если ошибка повторится, обновите экран.',
          en: 'Please try again. If the issue repeats, refresh the screen.',
        }[locale];
      }

      showNotice({
        title: String(title ?? ''),
        message: friendlyMessage ? String(friendlyMessage) : undefined,
        actionLabel: onlyButton?.text,
        onAction: onlyButton?.onPress,
      });
    };

    Alert.alert = patchedAlert;
    return () => {
      if (Alert.alert === patchedAlert) Alert.alert = nativeAlert;
    };
  }, [locale, showNotice]);

  const value = useMemo(() => ({ showNotice, hideNotice }), [hideNotice, showNotice]);
  const accent = notice?.tone === 'error' ? theme.danger : notice?.tone === 'success' ? theme.success : theme.plum;
  const soft = notice?.tone === 'error' ? theme.dangerSoft : notice?.tone === 'success' ? theme.goldSoft : theme.plumSoft;
  const icon = notice?.tone === 'error' ? 'error' : notice?.tone === 'success' ? 'check_circle' : 'info';
  const iosIcon = notice?.tone === 'error' ? 'exclamationmark.circle.fill' : notice?.tone === 'success' ? 'checkmark.circle.fill' : 'info.circle.fill';
  const runAction = () => {
    const action = notice?.onAction;
    hideNotice();
    action?.();
  };

  return (
    <NoticeContext.Provider value={value}>
      {children}
      {notice ? (
        <SafeAreaView pointerEvents="box-none" edges={['top']} style={styles.layer}>
          <View pointerEvents="box-none" style={styles.wrap}>
            <View style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, shadowColor: theme.shadow }]}>
              <View style={[styles.icon, { backgroundColor: soft }]}>
                <VizitIcon ios={iosIcon} android={icon} color={accent} size={23} />
              </View>
              <View style={styles.textWrap}>
                <Text numberOfLines={2} style={[styles.title, { color: theme.text }]}>{notice.title}</Text>
                {notice.message ? <Text numberOfLines={4} style={[styles.message, { color: theme.muted }]}>{notice.message}</Text> : null}
                {notice.actionLabel ? (
                  <Pressable accessibilityRole="button" onPress={runAction} style={({ pressed }) => [styles.action, { backgroundColor: soft, opacity: pressed ? 0.72 : 1 }]}>
                    <Text style={[styles.actionText, { color: accent }]}>{notice.actionLabel}</Text>
                  </Pressable>
                ) : null}
              </View>
              {!notice.onAction ? (
                <Pressable accessibilityRole="button" onPress={hideNotice} hitSlop={10} style={({ pressed }) => [styles.close, { opacity: pressed ? 0.55 : 1 }]}>
                  <VizitIcon ios="xmark" android="close" color={theme.muted} size={18} />
                </Pressable>
              ) : null}
              <View style={[styles.accent, { backgroundColor: accent }]} />
            </View>
          </View>
        </SafeAreaView>
      ) : null}
    </NoticeContext.Provider>
  );
}

export function useNotice() {
  const value = useContext(NoticeContext);
  if (!value) throw new Error('useNotice requires NoticeProvider');
  return value;
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 },
  wrap: { paddingHorizontal: 14, paddingTop: 8 },
  card: { minHeight: 78, borderRadius: 18, borderWidth: 1, padding: 12, paddingLeft: 15, flexDirection: 'row', alignItems: 'center', gap: 11, overflow: 'hidden', elevation: 12, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 7 } },
  icon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1, gap: 4 },
  title: { fontSize: 15, lineHeight: 20, fontWeight: '900' },
  message: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  action: { alignSelf: 'flex-start', minHeight: 32, borderRadius: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  actionText: { fontSize: 12, fontWeight: '900' },
  close: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  accent: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
});
