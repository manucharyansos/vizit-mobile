import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExistingBusinessSession } from '@/hooks/use-existing-business-session';
import { useApp } from '@/providers/app-provider';

export default function BusinessLogin() {
  const { theme } = useApp();
  const existingSession = useExistingBusinessSession();

  if (existingSession.isLoading) {
    return (
      <SafeAreaView style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} />
      </SafeAreaView>
    );
  }

  if (existingSession.data) {
    return <Redirect href="/(business)/today" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
