import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { ClientAuthShell } from '@/components/client-auth-shell';
import { PremiumButton, PremiumInput } from '@/components/premium-ui';
import { useApp } from '@/providers/app-provider';
import { clientAccountApi } from '@/services/api/client-account';

const copy = {
  hy: { title: 'Ստեղծիր հաշիվ', subtitle: 'Քո բոլոր այցերն ու ծանուցումները՝ մեկ անվտանգ հաշվում', name: 'Անուն ազգանուն', email: 'Էլ․ փոստ', phone: 'Հեռախոսահամար', password: 'Գաղտնաբառ՝ առնվազն 8 նիշ', confirm: 'Կրկնել գաղտնաբառը', submit: 'Գրանցվել', contact: 'Նշիր email կամ հեռախոսահամար', mismatch: 'Գաղտնաբառերը չեն համընկնում', failed: 'Գրանցումը չհաջողվեց' },
  ru: { title: 'Создать аккаунт', subtitle: 'Все визиты и уведомления в одном защищённом аккаунте', name: 'Имя и фамилия', email: 'Эл. почта', phone: 'Номер телефона', password: 'Пароль — минимум 8 символов', confirm: 'Повторите пароль', submit: 'Зарегистрироваться', contact: 'Укажите email или телефон', mismatch: 'Пароли не совпадают', failed: 'Не удалось зарегистрироваться' },
  en: { title: 'Create an account', subtitle: 'Keep every visit and notification in one secure account', name: 'Full name', email: 'Email', phone: 'Phone number', password: 'Password — at least 8 characters', confirm: 'Confirm password', submit: 'Create account', contact: 'Enter an email or phone number', mismatch: 'Passwords do not match', failed: 'Registration failed' },
};

export default function ClientRegisterScreen() {
  const { locale } = useApp();
  const c = copy[locale];
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmation: '' });
  const valid = form.name.trim().length >= 2 && Boolean(form.email.trim() || form.phone.trim()) && form.password.length >= 8 && form.password === form.confirmation;
  const register = useMutation({
    mutationFn: () => clientAccountApi.register({ name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, password: form.password, password_confirmation: form.confirmation }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['client-me'] }); router.replace('/(customer)/profile'); },
    onError: () => Alert.alert(c.failed),
  });
  const submit = () => {
    if (!form.email.trim() && !form.phone.trim()) return Alert.alert(c.contact);
    if (form.password !== form.confirmation) return Alert.alert(c.mismatch);
    register.mutate();
  };
  return (
    <ClientAuthShell title={c.title} subtitle={c.subtitle}>
      <PremiumInput label={c.name} placeholder={c.name} value={form.name} onChangeText={(name) => setForm((value) => ({ ...value, name }))} icon={{ ios: 'person.fill', android: 'person' }} />
      <PremiumInput label={c.email} placeholder={c.email} value={form.email} keyboardType="email-address" autoCapitalize="none" onChangeText={(email) => setForm((value) => ({ ...value, email }))} icon={{ ios: 'envelope.fill', android: 'mail' }} />
      <PremiumInput label={c.phone} placeholder={c.phone} value={form.phone} keyboardType="phone-pad" onChangeText={(phone) => setForm((value) => ({ ...value, phone }))} icon={{ ios: 'phone.fill', android: 'call' }} />
      <PremiumInput label={c.password} placeholder={c.password} value={form.password} secureTextEntry onChangeText={(password) => setForm((value) => ({ ...value, password }))} icon={{ ios: 'lock.fill', android: 'lock' }} />
      <PremiumInput label={c.confirm} placeholder={c.confirm} value={form.confirmation} secureTextEntry onChangeText={(confirmation) => setForm((value) => ({ ...value, confirmation }))} icon={{ ios: 'lock.rotation', android: 'password' }} />
      <PremiumButton title={c.submit} loading={register.isPending} disabled={!valid} onPress={submit} icon={{ ios: 'arrow.right', android: 'arrow_forward' }} />
    </ClientAuthShell>
  );
}
