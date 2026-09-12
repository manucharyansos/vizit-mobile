import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, PageHeader, PremiumButton, PremiumInput, SectionHeader, StateCard, StatusPill, Surface } from '@/components/premium-ui';
import { ui } from '@/constants/vizit-theme';
import { useApp } from '@/providers/app-provider';
import { businessApi, BusinessTask } from '@/services/api/business';
import { apiErrorMessage } from '@/services/api/client';
import { safeBack } from '@/services/navigation';

const copy = {
  hy: { title: 'Առաջադրանքներ', add: 'Նոր առաջադրանք', name: 'Վերնագիր', description: 'Նկարագրություն', save: 'Ստեղծել', cancel: 'Չեղարկել', start: 'Սկսել', done: 'Ավարտել', remove: 'Ջնջել', empty: 'Առաջադրանքներ դեռ չկան', emptyHint: 'Ստեղծեք առաջադրանք՝ աշխատանքը թիմում չկորցնելու համար։', error: 'Գործողությունը չհաջողվեց', loadError: 'Չհաջողվեց բեռնել առաջադրանքները', retry: 'Կրկին փորձել' },
  ru: { title: 'Задачи', add: 'Новая задача', name: 'Заголовок', description: 'Описание', save: 'Создать', cancel: 'Отмена', start: 'Начать', done: 'Завершить', remove: 'Удалить', empty: 'Задач пока нет', emptyHint: 'Создайте задачу, чтобы ничего не потерялось в работе команды.', error: 'Не удалось выполнить', loadError: 'Не удалось загрузить задачи', retry: 'Повторить' },
  en: { title: 'Tasks', add: 'New task', name: 'Title', description: 'Description', save: 'Create', cancel: 'Cancel', start: 'Start', done: 'Complete', remove: 'Delete', empty: 'No tasks yet', emptyHint: 'Create a task to keep team work visible and organized.', error: 'Action failed', loadError: 'Could not load tasks', retry: 'Try again' },
};

export default function TasksScreen() {
  const { locale, theme } = useApp();
  const c = copy[locale];
  const cache = useQueryClient();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const query = useQuery({ queryKey: ['business-tasks'], queryFn: businessApi.tasks, retry: false, refetchOnMount: 'always' });
  const fail = (error: unknown) => Alert.alert(c.error, apiErrorMessage(error));
  const create = useMutation({ mutationFn: () => businessApi.createTask({ title: form.title.trim(), description: form.description.trim(), priority: 'medium' }), onSuccess: async () => { setForm({ title: '', description: '' }); setShow(false); await cache.invalidateQueries({ queryKey: ['business-tasks'] }); await cache.refetchQueries({ queryKey: ['business-tasks'], type: 'active' }); }, onError: fail });
  const update = useMutation({ mutationFn: ({ item, status }: { item: BusinessTask; status: BusinessTask['status'] }) => businessApi.updateTask(item.id, { status }), onSuccess: () => void cache.invalidateQueries({ queryKey: ['business-tasks'] }), onError: fail });
  const remove = useMutation({ mutationFn: businessApi.deleteTask, onSuccess: () => void cache.invalidateQueries({ queryKey: ['business-tasks'] }), onError: fail });

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <PageHeader eyebrow="Vizit Pro" title={c.title} subtitle={c.emptyHint} onBack={() => safeBack('/(business)/more')} backLabel={c.title} action={<IconButton ios={show ? 'xmark' : 'plus'} android={show ? 'close' : 'add'} accessibilityLabel={show ? c.cancel : c.add} tone={show ? 'neutral' : 'primary'} onPress={() => setShow((value) => !value)} />} />
    {show ? <Surface elevated style={styles.form}><SectionHeader title={c.add} /><PremiumInput label={c.name} value={form.title} onChangeText={(title) => setForm((value) => ({ ...value, title }))} placeholder={c.name} icon={{ ios: 'checklist', android: 'task_alt' }} /><PremiumInput label={c.description} value={form.description} onChangeText={(description) => setForm((value) => ({ ...value, description }))} placeholder={c.description} multiline icon={{ ios: 'text.alignleft', android: 'notes' }} /><View style={styles.actions}><PremiumButton title={c.cancel} tone="secondary" onPress={() => setShow(false)} style={styles.flex} /><PremiumButton title={c.save} loading={create.isPending} disabled={form.title.trim().length < 2} onPress={() => create.mutate()} style={styles.flex} /></View></Surface> : null}
    {!query.isLoading && !query.isError ? <SectionHeader title={c.title} detail={String(query.data?.length ?? 0)} /> : null}
    {query.isLoading ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : query.isError ? <StateCard title={c.loadError} message={apiErrorMessage(query.error)} tone="danger" action={<PremiumButton title={c.retry} tone="secondary" onPress={() => void query.refetch()} />} /> : query.data?.length ? query.data.map((item) => <Surface key={item.id} style={styles.card}><View style={styles.taskTop}><StatusPill label={item.priority} tone={item.priority === 'urgent' ? 'danger' : 'accent'} /><StatusPill label={item.status.replace('_', ' ')} tone={item.status === 'completed' ? 'success' : item.status === 'in_progress' ? 'warning' : 'neutral'} /></View><Text style={[styles.taskTitle, { color: theme.text }]}>{item.title}</Text>{item.description ? <Text style={[styles.description, { color: theme.muted }]}>{item.description}</Text> : null}<View style={styles.actions}>{item.status === 'open' ? <PremiumButton title={c.start} compact tone="secondary" onPress={() => update.mutate({ item, status: 'in_progress' })} style={styles.flex} /> : null}{item.status !== 'completed' ? <PremiumButton title={c.done} compact onPress={() => update.mutate({ item, status: 'completed' })} style={styles.flex} /> : null}<PremiumButton title={c.remove} compact tone="danger" onPress={() => remove.mutate(item.id)} style={styles.flex} /></View></Surface>) : <StateCard title={c.empty} message={c.emptyHint} icon={{ ios: 'checklist', android: 'task_alt' }} action={<PremiumButton title={c.add} tone="secondary" onPress={() => setShow(true)} />} />}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: ui.screenGutter, gap: ui.spacing.md, paddingBottom: ui.spacing.xxl },
  form: { gap: ui.spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: ui.spacing.xs },
  flex: { flex: 1, minWidth: 92 },
  loader: { marginVertical: ui.spacing.lg },
  card: { gap: ui.spacing.sm },
  taskTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ui.spacing.sm },
  taskTitle: ui.type.cardTitle,
  description: ui.type.body,
});
