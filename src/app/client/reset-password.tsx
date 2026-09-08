import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { ClientAuthShell } from '@/components/client-auth-shell';
import { useApp } from '@/providers/app-provider';
import { clientAccountApi } from '@/services/api/client-account';

const copy = { hy: { title: 'Նոր գաղտնաբառ', subtitle: 'Սահմանիր նոր անվտանգ գաղտնաբառ', email: 'Էլ․ փոստ', password: 'Նոր գաղտնաբառ՝ առնվազն 8 նիշ', confirm: 'Կրկնել գաղտնաբառը', submit: 'Պահպանել գաղտնաբառը', invalid: 'Վերականգնման հղումը թերի կամ անվավեր է', mismatch: 'Գաղտնաբառերը չեն համընկնում', done: 'Գաղտնաբառը փոխված է', failed: 'Չհաջողվեց փոխել գաղտնաբառը' }, ru: { title: 'Новый пароль', subtitle: 'Установите новый безопасный пароль', email: 'Эл. почта', password: 'Новый пароль — минимум 8 символов', confirm: 'Повторите пароль', submit: 'Сохранить пароль', invalid: 'Ссылка неполная или недействительная', mismatch: 'Пароли не совпадают', done: 'Пароль изменён', failed: 'Не удалось изменить пароль' }, en: { title: 'New password', subtitle: 'Choose a new secure password', email: 'Email', password: 'New password — at least 8 characters', confirm: 'Confirm password', submit: 'Save password', invalid: 'The reset link is incomplete or invalid', mismatch: 'Passwords do not match', done: 'Password updated', failed: 'Could not update password' } };

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>(); const { locale, theme } = useApp(); const c = copy[locale];
  const [email, setEmail] = useState(params.email ?? ''); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const mutation = useMutation({ mutationFn: () => clientAccountApi.resetPassword({ token: params.token!, email: email.trim(), password, password_confirmation: confirmation }), onSuccess: () => Alert.alert(c.done, '', [{ text: 'OK', onPress: () => router.replace('/(customer)/profile') }]), onError: () => Alert.alert(c.failed) });
  const valid = Boolean(params.token && /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 8 && password === confirmation);
  const submit = () => { if (!params.token) return Alert.alert(c.invalid); if (password !== confirmation) return Alert.alert(c.mismatch); mutation.mutate(); };
  return <ClientAuthShell title={c.title} subtitle={params.token ? c.subtitle : c.invalid} icon="key.fill"><Field value={email} onChangeText={setEmail} placeholder={c.email} keyboardType="email-address" autoCapitalize="none" /><Field value={password} onChangeText={setPassword} placeholder={c.password} secureTextEntry /><Field value={confirmation} onChangeText={setConfirmation} placeholder={c.confirm} secureTextEntry /><Pressable disabled={!valid || mutation.isPending} onPress={submit} style={[styles.button, { backgroundColor: theme.plum, opacity: valid ? 1 : 0.42 }]}>{mutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{c.submit}</Text>}</Pressable></ClientAuthShell>;
}
function Field(props: React.ComponentProps<typeof TextInput>) { const { theme } = useApp(); return <TextInput {...props} placeholderTextColor={theme.muted} style={[styles.field, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]} />; }
const styles = StyleSheet.create({ field: { height: 54, borderWidth: 1, borderRadius: 16, paddingHorizontal: 15, fontSize: 15 }, button: { height: 55, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginTop: 3 }, buttonText: { color: '#FFF', fontSize: 15, fontWeight: '900' } });
