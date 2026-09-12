import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';

export function BusinessListSkeleton({ count = 3 }: { count?: number }) {
  const { theme } = useApp(); const [opacity] = useState(() => new Animated.Value(0.35));
  useEffect(() => { const animation = Animated.loop(Animated.sequence([Animated.timing(opacity, { toValue: 0.8, duration: 650, useNativeDriver: true }), Animated.timing(opacity, { toValue: 0.35, duration: 650, useNativeDriver: true })])); animation.start(); return () => animation.stop(); }, [opacity]);
  return <View style={styles.list}>{Array.from({ length: count }, (_, index) => <Animated.View key={index} style={[styles.card, { opacity, backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}><View style={[styles.logo, { backgroundColor: theme.accentSubtle }]} /><View style={styles.lines}><View style={[styles.lineWide, { backgroundColor: theme.surface }]} /><View style={[styles.lineShort, { backgroundColor: theme.surface }]} /><View style={[styles.lineTiny, { backgroundColor: theme.surface }]} /></View><View style={[styles.action, { backgroundColor: theme.accentSoft }]} /></Animated.View>)}</View>;
}
const styles = StyleSheet.create({ list: { gap: 10 }, card: { height: 92, borderRadius: ui.radius.large, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center' }, logo: { width: 68, height: 68, borderRadius: ui.radius.medium }, lines: { flex: 1, gap: 7, marginLeft: 11 }, lineWide: { width: '72%', height: 11, borderRadius: 6 }, lineShort: { width: '52%', height: 8, borderRadius: 5 }, lineTiny: { width: '62%', height: 7, borderRadius: 4 }, action: { width: 52, height: 32, borderRadius: 11 } });
