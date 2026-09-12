import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { ClientAuthShell } from '@/components/client-auth-shell';
import { PremiumButton, PremiumInput } from '@/components/premium-ui';
import { useApp } from '@/providers/app-provider';
import { clientAccountApi } from '@/services/api/client-account';

const copy = {
  hy: { title: 'Նոր գաղտնաբառ', subtitle: 'Սահմանիր նոր անվտանգ գաղտնաբառ', email: 'Էլ․ փոստ', password: 'Նոր գաղտնաբառ՝ առնվազն 8 նիշ', confirm: 'Կրկնել գաղտնաբառը', submit: 'Պահպանել գաղտնաբառը', invalid: 'Վերականգնման հղումը թերի կամ անվավեր է', mismatch: 'Գաղտնաբառերը չեն համընկնում', done: 'Գաղտնաբառը փոխված է', failed: 'Չհաջողվեց փոխել գաղտնաբառը' },
  ru: { title: 'Новый пароль', subtitle: 'Установите новый безопасный пароль', email: 'Эл. почта', password: 'Новый пароль — минимум 8 символов', confirm: 'Повторите пароль', submit: 'Сохранить пароль', invalid: 'Ссылка неполная или недействительная', mismatch: 'Пароли не совпадают', done: 'Пароль изменён', failed: 'Не удалось изменить пароль' },
  en: { title: 'New password', subtitle: 'Choose a new secure password', email: 'Email', password: 'New password — at least 8 characters', confirm: 'Confirm password', submit: 'Save password', invalid: 'The reset link is incomplete or invalid', mismatch: 'Passwords do not match', done: 'Password updated', failed: 'Could not update password' },
};

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const { locale } = useApp();
  const c = copy[locale];
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const mutation = useMutation({
    mutationFn: () => clientAccountApi.resetPassword({ token: params.token!, email: email.trim(), password, password_confirmation: confirmation }),
    onSuccess: () => Alert.alert(c.done, '', [{ text: 'OK', onPress: () => router.replace('/(customer)/profile') }]),
    onError: () => Alert.alert(c.failed),
  });
  const valid = Boolean(params.token && /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 8 && password === confirmation);
  const submit = () => {
    if (!params.token) return Alert.alert(c.invalid);
    if (password !== confirmation) return Alert.alert(c.mismatch);
    mutation.mutate();
  };
  return (
    <ClientAuthShell title={c.title} subtitle={params.token ? c.subtitle : c.invalid} icon="key.fill">
      <PremiumInput label={c.email} value={email} onChangeText={setEmail} placeholder={c.email} keyboardType="email-address" autoCapitalize="none" icon={{ ios: 'envelope.fill', android: 'mail' }} />
      <PremiumInput label={c.password} value={password} onChangeText={setPassword} placeholder={c.password} secureTextEntry icon={{ ios: 'lock.fill', android: 'lock' }} />
      <PremiumInput label={c.confirm} value={confirmation} onChangeText={setConfirmation} placeholder={c.confirm} secureTextEntry icon={{ ios: 'lock.rotation', android: 'password' }} />
      <PremiumButton title={c.submit} loading={mutation.isPending} disabled={!valid} onPress={submit} icon={{ ios: 'checkmark', android: 'check' }} />
    </ClientAuthShell>
  );
}
