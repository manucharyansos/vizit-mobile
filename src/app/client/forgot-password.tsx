import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { ClientAuthShell } from '@/components/client-auth-shell';
import { PremiumButton, PremiumInput } from '@/components/premium-ui';
import { VizitIcon } from '@/components/vizit-icon';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { clientAccountApi } from '@/services/api/client-account';

const copy = {
  hy: { title: 'Վերականգնել գաղտնաբառը', subtitle: 'Կուղարկենք վերականգնման անվտանգ հղումը քո email-ին', email: 'Էլ․ փոստ', submit: 'Ուղարկել հղումը', sent: 'Հղումն ուղարկված է', hint: 'Ստուգիր նաև Spam պանակը։', failed: 'Չհաջողվեց ուղարկել նամակը' },
  ru: { title: 'Восстановить пароль', subtitle: 'Отправим безопасную ссылку для восстановления на ваш email', email: 'Эл. почта', submit: 'Отправить ссылку', sent: 'Ссылка отправлена', hint: 'Проверьте также папку «Спам».', failed: 'Не удалось отправить письмо' },
  en: { title: 'Reset your password', subtitle: 'We will email you a secure password reset link', email: 'Email', submit: 'Send reset link', sent: 'Reset link sent', hint: 'Please check your spam folder too.', failed: 'Could not send the email' },
};

export default function ForgotPasswordScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const mutation = useMutation({ mutationFn: () => clientAccountApi.forgotPassword(email.trim()), onSuccess: () => setSent(true), onError: () => Alert.alert(c.failed) });
  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  return (
    <ClientAuthShell title={c.title} subtitle={c.subtitle} icon="key.fill">
      {sent ? (
        <View style={styles.sent}>
          <View style={[styles.sentIcon, { backgroundColor: theme.successSoft }]}><VizitIcon ios="envelope.badge.fill" android="mark_email_read" color={theme.success} size={28} /></View>
          <Text style={[styles.sentTitle, { color: theme.text }]}>{c.sent}</Text>
          <Text style={[styles.hint, { color: theme.muted }]}>{c.hint}</Text>
        </View>
      ) : (
        <>
          <PremiumInput label={c.email} value={email} onChangeText={setEmail} placeholder={c.email} keyboardType="email-address" autoCapitalize="none" icon={{ ios: 'envelope.fill', android: 'mail' }} />
          <PremiumButton title={c.submit} loading={mutation.isPending} disabled={!validEmail} onPress={() => mutation.mutate()} icon={{ ios: 'paperplane.fill', android: 'send' }} />
        </>
      )}
    </ClientAuthShell>
  );
}

const styles = StyleSheet.create({
  sent: { alignItems: 'center', paddingVertical: 12 },
  sentIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  sentTitle: ui.type.sectionTitle,
  hint: { ...ui.type.body, textAlign: 'center', marginTop: 7 },
});
