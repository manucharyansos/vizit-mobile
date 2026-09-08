import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useApp } from '@/providers/app-provider';

export function BusinessListSkeleton({ count = 3 }: { count?: number }) {
  const { theme } = useApp(); const [opacity] = useState(() => new Animated.Value(0.35));
  useEffect(() => { const animation = Animated.loop(Animated.sequence([Animated.timing(opacity, { toValue: 0.8, duration: 650, useNativeDriver: true }), Animated.timing(opacity, { toValue: 0.35, duration: 650, useNativeDriver: true })])); animation.start(); return () => animation.stop(); }, [opacity]);
  return <View style={styles.list}>{Array.from({ length: count }, (_, index) => <Animated.View key={index} style={[styles.card, { opacity, backgroundColor: theme.surface, borderColor: theme.border }]}><View style={[styles.logo, { backgroundColor: theme.cream }]} /><View style={styles.lines}><View style={[styles.lineWide, { backgroundColor: theme.cream }]} /><View style={[styles.lineShort, { backgroundColor: theme.cream }]} /></View></Animated.View>)}</View>;
}
const styles = StyleSheet.create({ list: { padding: 16, gap: 10 }, card: { height: 80, borderRadius: 18, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center' }, logo: { width: 54, height: 54, borderRadius: 16 }, lines: { flex: 1, gap: 9, marginLeft: 12 }, lineWide: { width: '72%', height: 12, borderRadius: 6 }, lineShort: { width: '46%', height: 9, borderRadius: 5 } });
