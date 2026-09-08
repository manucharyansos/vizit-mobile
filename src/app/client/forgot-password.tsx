import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ClientAuthShell } from '@/components/client-auth-shell';
import { VizitIcon } from '@/components/vizit-icon';
import { useApp } from '@/providers/app-provider';
import { clientAccountApi } from '@/services/api/client-account';

const copy = { hy: { title: 'Վերականգնել գաղտնաբառը', subtitle: 'Կուղարկենք վերականգնման անվտանգ հղումը քո email-ին', email: 'Էլ․ փոստ', submit: 'Ուղարկել հղումը', sent: 'Հղումն ուղարկված է', hint: 'Ստուգիր նաև Spam պանակը։', failed: 'Չհաջողվեց ուղարկել նամակը' }, ru: { title: 'Восстановить пароль', subtitle: 'Отправим безопасную ссылку для восстановления на ваш email', email: 'Эл. почта', submit: 'Отправить ссылку', sent: 'Ссылка отправлена', hint: 'Проверьте также папку «Спам».', failed: 'Не удалось отправить письмо' }, en: { title: 'Reset your password', subtitle: 'We will email you a secure password reset link', email: 'Email', submit: 'Send reset link', sent: 'Reset link sent', hint: 'Please check your spam folder too.', failed: 'Could not send the email' } };

export default function ForgotPasswordScreen() {
  const { locale, theme } = useApp(); const c = copy[locale]; const [email, setEmail] = useState(''); const [sent, setSent] = useState(false);
  const mutation = useMutation({ mutationFn: () => clientAccountApi.forgotPassword(email.trim()), onSuccess: () => setSent(true), onError: () => Alert.alert(c.failed) });
  return <ClientAuthShell title={c.title} subtitle={c.subtitle} icon="key.fill">{sent ? <View style={styles.sent}><View style={[styles.sentIcon, { backgroundColor: theme.goldSoft }]}><VizitIcon ios="envelope.badge.fill" android="mark_email_read" color={theme.success} size={29} /></View><Text style={[styles.sentTitle, { color: theme.text }]}>{c.sent}</Text><Text style={[styles.hint, { color: theme.muted }]}>{c.hint}</Text></View> : <><TextInput value={email} onChangeText={setEmail} placeholder={c.email} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={theme.muted} style={[styles.field, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} /><Pressable disabled={!/^\S+@\S+\.\S+$/.test(email.trim()) || mutation.isPending} onPress={() => mutation.mutate()} style={[styles.button, { backgroundColor: theme.plum, opacity: email ? 1 : 0.42 }]}>{mutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{c.submit}</Text>}</Pressable></>}</ClientAuthShell>;
}
const styles = StyleSheet.create({ field: { height: 54, borderWidth: 1, borderRadius: 16, paddingHorizontal: 15, fontSize: 15 }, button: { height: 55, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginTop: 3 }, buttonText: { color: '#FFF', fontSize: 15, fontWeight: '900' }, sent: { alignItems: 'center', paddingVertical: 10 }, sentIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 13 }, sentTitle: { fontSize: 19, fontWeight: '900' }, hint: { fontSize: 13, textAlign: 'center', marginTop: 7 } });
