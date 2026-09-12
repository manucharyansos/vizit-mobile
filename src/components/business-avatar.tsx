import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/providers/app-provider';
import { ui } from '@/constants/vizit-theme';

export function BusinessAvatar({ name, uri, size = 56 }: { name: string; uri?: string | null; size?: number }) {
  const { theme } = useApp();
  const [failedUri, setFailedUri] = useState<string>();
  return <View style={[styles.avatar, { width: size, height: size, backgroundColor: theme.accentSubtle, borderColor: theme.border }]}>
    <Text style={[styles.initial, { color: theme.accentText, fontSize: size * 0.38 }]}>{name.trim().slice(0, 1).toLocaleUpperCase()}</Text>
    {uri && failedUri !== uri ? <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setFailedUri(uri)} transition={120} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  avatar: { flexShrink: 0, borderWidth: 1, borderRadius: ui.radius.medium, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '600' },
});
