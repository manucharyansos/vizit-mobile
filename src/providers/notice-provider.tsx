import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';

type NoticeTone = 'success' | 'error' | 'info';
type NoticeInput = {
  title: string;
  message?: string;
  tone?: NoticeTone;
  duration?: number;
};
type NoticeState = NoticeInput & { id: number; tone: NoticeTone; duration: number };
type NoticeContextValue = {
  showNotice: (notice: NoticeInput) => void;
  hideNotice: () => void;
};

const NoticeContext = createContext<NoticeContextValue | null>(null);

export function NoticeProvider({ children }: PropsWithChildren) {
  const { theme } = useApp();
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const hideNotice = useCallback(() => setNotice(null), []);
  const showNotice = useCallback((input: NoticeInput) => {
    setNotice({
      ...input,
      id: Date.now(),
      tone: input.tone ?? 'info',
      duration: input.duration ?? (input.tone === 'error' ? 5200 : 3800),
    });
  }, []);

  useEffect(() => {
    if (!notice || notice.duration <= 0) return;
    const timer = setTimeout(hideNotice, notice.duration);
    return () => clearTimeout(timer);
  }, [hideNotice, notice]);

  const value = useMemo(() => ({ showNotice, hideNotice }), [hideNotice, showNotice]);
  const accent = notice?.tone === 'error' ? theme.danger : notice?.tone === 'success' ? theme.success : theme.plum;
  const soft = notice?.tone === 'error' ? theme.dangerSoft : notice?.tone === 'success' ? theme.goldSoft : theme.plumSoft;
  const icon = notice?.tone === 'error' ? 'error' : notice?.tone === 'success' ? 'check_circle' : 'info';
  const iosIcon = notice?.tone === 'error' ? 'exclamationmark.circle.fill' : notice?.tone === 'success' ? 'checkmark.circle.fill' : 'info.circle.fill';

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
              </View>
              <Pressable accessibilityRole="button" onPress={hideNotice} hitSlop={10} style={({ pressed }) => [styles.close, { opacity: pressed ? 0.55 : 1 }]}>
                <VizitIcon ios="xmark" android="close" color={theme.muted} size={18} />
              </Pressable>
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
  textWrap: { flex: 1, gap: 3 },
  title: { fontSize: 15, lineHeight: 20, fontWeight: '900' },
  message: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  close: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  accent: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
});
