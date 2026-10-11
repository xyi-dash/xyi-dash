<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import api from '@/service/api';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

const loading = ref(true);
const analytics = ref(null);
const weekOffset = ref(0);
const showHidden = ref(false);

const settingsVisible = ref(false);
const settingsSaving = ref(false);
const settingsForm = ref({
    low_online_hours: 2,
    old_card_hours: 12,
    many_pending_cards: 5
});

const noteVisible = ref(false);
const noteSaving = ref(false);
const selectedAdmin = ref(null);
const noteDraft = ref('');
const watchedDraft = ref(false);

const summaryCards = computed(() => {
    const summary = analytics.value?.summary || {};
    const comparison = analytics.value?.comparison || {};

    return [
        {
            label: 'Старших на сервере',
            value: summary.senior_total || 0,
            hint: `Онлайн сейчас: ${summary.online_now || 0}`,
            delta: `На контроле: ${summary.watched_total || 0}`,
            icon: 'pi pi-users',
            tone: 'blue'
        },
        {
            label: 'Создано карточек',
            value: summary.cards_created || 0,
            hint: `В ожидании: ${summary.cards_pending || 0}`,
            delta: deltaNumber(comparison.cards_created),
            icon: 'pi pi-file-edit',
            tone: 'purple'
        },
        {
            label: 'Выдано баллов',
            value: summary.points_added || 0,
            hint: `Операций: ${summary.point_actions || 0}`,
            delta: deltaNumber(comparison.points_added),
            icon: 'pi pi-bolt',
            tone: 'green'
        },
        {
            label: 'Онлайн за неделю',
            value: summary.week_online || '00:00',
            hint: `Сегодня: ${summary.today_online || '00:00'}`,
            delta: comparison.week_online || '+00:00',
            icon: 'pi pi-clock',
            tone: 'orange'
        }
    ];
});

async function loadAnalytics() {
    loading.value = true;
    try {
        const params = new URLSearchParams();
        if (authStore.currentServer) params.set('server', authStore.currentServer);
        params.set('week_offset', String(weekOffset.value || 0));
        if (showHidden.value) params.set('include_hidden', '1');

        const { data } = await api.get(`/admin/senior-analytics?${params.toString()}`);
        analytics.value = data;
        weekOffset.value = data.week_offset || 0;
        showHidden.value = !!data.include_hidden;
        settingsForm.value = { ...data.settings };
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Ошибка',
            detail: error.response?.data?.message || 'Не удалось загрузить аналитику старшей администрации',
            life: 4000
        });
    } finally {
        loading.value = false;
    }
}

function openSettings() {
    settingsForm.value = { ...(analytics.value?.settings || settingsForm.value) };
    settingsVisible.value = true;
}

async function saveSettings() {
    settingsSaving.value = true;
    try {
        const params = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        const { data } = await api.patch(`/admin/senior-analytics/settings${params}`, settingsForm.value);
        analytics.value.settings = data.settings;
        settingsVisible.value = false;
        toast.add({ severity: 'success', summary: 'Сохранено', detail: 'Пороги аналитики обновлены', life: 2500 });
        await loadAnalytics();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Ошибка',
            detail: error.response?.data?.message || 'Не удалось сохранить пороги',
            life: 4000
        });
    } finally {
        settingsSaving.value = false;
    }
}

function openNote(row) {
    selectedAdmin.value = row;
    noteDraft.value = row.note || '';
    watchedDraft.value = !!row.watched;
    noteVisible.value = true;
}

async function saveAdminMeta(row = selectedAdmin.value, payload = null) {
    if (!row) return;

    noteSaving.value = true;
    try {
        const params = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        const body = payload || {
            watched: watchedDraft.value,
            note: noteDraft.value
        };
        const { data } = await api.patch(`/admin/senior-analytics/admins/${encodeURIComponent(row.name)}/meta${params}`, body);

        row.watched = data.meta.watched;
        row.note = data.meta.note;
        row.note_updated_by = data.meta.updated_by_name;

        if (selectedAdmin.value?.name === row.name) {
            selectedAdmin.value = row;
        }

        noteVisible.value = false;
        toast.add({ severity: 'success', summary: 'Сохранено', detail: 'Отметка обновлена', life: 2200 });
        await loadAnalytics();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Ошибка',
            detail: error.response?.data?.message || 'Не удалось сохранить отметку',
            life: 4000
        });
    } finally {
        noteSaving.value = false;
    }
}

async function toggleWatched(row) {
    await saveAdminMeta(row, { watched: row.watched });
}

async function toggleHidden(row) {
    await saveAdminMeta(row, { hidden_from_analytics: row.hidden_from_analytics });
}

async function copyReport() {
    const text = analytics.value?.report_text || '';
    if (!text) return;

    try {
        await navigator.clipboard.writeText(text);
        toast.add({ severity: 'success', summary: 'Скопировано', detail: 'Отчёт скопирован в буфер', life: 2200 });
    } catch {
        toast.add({ severity: 'warn', summary: 'Не скопировано', detail: 'Браузер не дал доступ к буферу обмена', life: 3500 });
    }
}

function goAttention(item) {
    if (item.action === 'cards') {
        router.push('/extended/pending-cards');
        return;
    }

    if (item.admin) {
        router.push(`/admins/${encodeURIComponent(item.admin)}`);
    }
}

function statusSeverity(row) {
    return row.is_online ? 'success' : 'secondary';
}

function attentionSeverity(item) {
    if (item.severity === 'danger') return 'danger';
    if (item.severity === 'warning') return 'warn';
    return 'info';
}

function attentionIcon(item) {
    if (item.severity === 'danger') return 'pi pi-exclamation-triangle';
    if (item.severity === 'warning') return 'pi pi-info-circle';
    return item.title === 'На контроле' ? 'pi pi-eye' : 'pi pi-search';
}

function deltaNumber(value) {
    const number = Number(value || 0);
    return `${number >= 0 ? '+' : ''}${number}`;
}

function deltaClass(delta) {
    if (!delta) return 'text-muted-color';
    const value = String(delta);
    if (value.startsWith('-')) return 'text-red-400';
    if (value.startsWith('+') && value !== '+0' && value !== '+00:00') return 'text-green-400';
    return 'text-muted-color';
}

watch(() => authStore.currentServer, () => {
    weekOffset.value = 0;
    loadAnalytics();
});

onMounted(loadAnalytics);
</script>

<template>
    <div class="flex flex-col gap-6">
        <div class="card senior-hero">
            <div>
                <div class="text-muted-color text-sm mb-2">Неделя: {{ analytics?.week?.label || '...' }}</div>
                <h1 class="text-3xl font-bold m-0">Аналитика старшей адм.</h1>
                <p class="text-muted-color mt-2 mb-0">Сводка по всем администраторам 6 уровня выбранного сервера.</p>
            </div>

            <div class="senior-actions">
                <Select
                    v-model="weekOffset"
                    :options="analytics?.week_options || []"
                    optionLabel="label"
                    optionValue="value"
                    class="week-select"
                    @update:modelValue="loadAnalytics"
                />
                <Button icon="pi pi-sliders-h" label="Пороги" outlined @click="openSettings" />
                <Button icon="pi pi-copy" label="Отчёт" outlined @click="copyReport" />
                <label v-if="analytics?.permissions?.can_manage_hidden" class="hidden-toggle">
                    <Checkbox v-model="showHidden" binary @change="loadAnalytics" />
                    <span>Показать скрытых</span>
                </label>
                <Button icon="pi pi-refresh" label="Обновить" :loading="loading" outlined @click="loadAnalytics" />
            </div>
        </div>

        <ProgressSpinner v-if="loading" class="self-center my-10" />

        <template v-else-if="analytics">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div v-for="card in summaryCards" :key="card.label" class="card senior-summary-card">
                    <div :class="['senior-summary-icon', `tone-${card.tone}`]">
                        <i :class="card.icon"></i>
                    </div>
                    <div class="text-muted-color text-sm">{{ card.label }}</div>
                    <div class="text-3xl font-bold">{{ card.value }}</div>
                    <div class="summary-bottom">
                        <span class="text-xs text-muted-color">{{ card.hint }}</span>
                        <span :class="['text-xs font-semibold', deltaClass(card.delta)]">{{ card.delta }}</span>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="flex items-center justify-between gap-3 mb-4">
                    <div>
                        <h2 class="text-xl font-bold m-0">Требует внимания</h2>
                        <div class="text-sm text-muted-color mt-1">Кликабельные подсказки по старшей администрации за выбранную неделю.</div>
                    </div>
                    <Tag :value="`${analytics.attention?.length || 0}`" severity="warning" />
                </div>

                <div v-if="analytics.attention?.length" class="attention-grid">
                    <button
                        v-for="item in analytics.attention"
                        :key="`${item.title}-${item.admin}-${item.metric}`"
                        class="attention-card"
                        type="button"
                        @click="goAttention(item)"
                    >
                        <div class="attention-icon">
                            <i :class="attentionIcon(item)"></i>
                        </div>
                        <div class="min-w-0 text-left">
                            <div class="flex items-center gap-2 mb-1">
                                <Tag :value="item.title" :severity="attentionSeverity(item)" />
                            </div>
                            <div class="font-semibold">{{ item.admin }}</div>
                            <div class="text-sm text-muted-color mt-1">{{ item.message }}</div>
                        </div>
                    </button>
                </div>

                <div v-else class="text-sm text-muted-color py-3">
                    Критичных подсказок по старшей администрации сейчас нет.
                </div>
            </div>

            <div class="card">
                <div class="flex items-center justify-between gap-3 mb-4">
                    <div>
                        <h2 class="text-xl font-bold m-0">Рейтинг старшей администрации</h2>
                        <div class="text-sm text-muted-color mt-1">
                            Сортировка учитывает карточки, операции с баллами и онлайн за неделю.
                        </div>
                    </div>
                    <Tag :value="`Всего: ${analytics.admins.length}`" />
                </div>

                <DataTable :value="analytics.admins" stripedRows responsiveLayout="scroll">
                    <Column header="#" style="width: 64px">
                        <template #body="{ index }">{{ index + 1 }}</template>
                    </Column>

                    <Column field="name" header="Админ">
                        <template #body="{ data }">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-semibold text-primary">{{ data.name }}</span>
                                <Tag v-if="data.is_ga" value="GA" severity="success" size="small" />
                                <Tag v-if="data.watched" value="Контроль" severity="info" size="small" />
                                <Tag v-if="data.hidden_from_analytics" value="Скрыт" severity="secondary" size="small" />
                            </div>
                        </template>
                    </Column>

                    <Column header="Статус" style="width: 130px">
                        <template #body="{ data }">
                            <Tag :value="data.is_online ? 'Онлайн' : 'Оффлайн'" :severity="statusSeverity(data)" />
                        </template>
                    </Column>

                    <Column field="cards_created" header="Карточки" sortable>
                        <template #body="{ data }">
                            <div class="font-semibold">{{ data.cards_created }}</div>
                            <div class="text-xs text-muted-color">ожид.: {{ data.cards_pending }} · +{{ data.cards_approved }} / -{{ data.cards_rejected }}</div>
                        </template>
                    </Column>

                    <Column field="points_added" header="Баллы" sortable>
                        <template #body="{ data }">
                            <span class="font-semibold text-green-500">+{{ data.points_added }}</span>
                            <span class="text-xs text-muted-color ml-2">{{ data.point_actions }} оп.</span>
                        </template>
                    </Column>

                    <Column field="today_online_seconds" header="Сегодня" sortable>
                        <template #body="{ data }">{{ data.today_online }}</template>
                    </Column>

                    <Column field="week_online_seconds" header="Неделя" sortable>
                        <template #body="{ data }">{{ data.week_online }}</template>
                    </Column>

                    <Column header="Контроль" style="width: 120px">
                        <template #body="{ data }">
                            <Checkbox v-model="data.watched" binary @change="toggleWatched(data)" />
                        </template>
                    </Column>

                    <Column v-if="analytics.permissions?.can_manage_hidden" header="Не показывать" style="width: 150px">
                        <template #body="{ data }">
                            <Checkbox v-model="data.hidden_from_analytics" binary @change="toggleHidden(data)" />
                        </template>
                    </Column>

                    <Column header="Заметка" style="min-width: 220px">
                        <template #body="{ data }">
                            <div class="note-cell">
                                <span v-if="data.note" class="note-preview">{{ data.note }}</span>
                                <span v-else class="text-muted-color text-sm">Нет заметки</span>
                                <Button icon="pi pi-pencil" text rounded size="small" @click="openNote(data)" />
                            </div>
                        </template>
                    </Column>

                    <template #empty>
                        <div class="text-center py-8 text-muted-color">Старших администраторов на этом сервере не найдено</div>
                    </template>
                </DataTable>
            </div>
        </template>

        <Dialog v-model:visible="settingsVisible" modal header="Пороги аналитики" :style="{ width: '34rem' }">
            <div class="flex flex-col gap-4">
                <div>
                    <label class="block text-sm mb-2">Низкий онлайн за неделю, часов</label>
                    <InputNumber v-model="settingsForm.low_online_hours" :min="0" :max="168" class="w-full" />
                </div>
                <div>
                    <label class="block text-sm mb-2">Старая карточка в ожидании, часов</label>
                    <InputNumber v-model="settingsForm.old_card_hours" :min="1" :max="168" class="w-full" />
                </div>
                <div>
                    <label class="block text-sm mb-2">Много карточек в ожидании, от</label>
                    <InputNumber v-model="settingsForm.many_pending_cards" :min="1" :max="100" class="w-full" />
                </div>
            </div>

            <template #footer>
                <Button label="Отмена" text @click="settingsVisible = false" />
                <Button label="Сохранить" icon="pi pi-check" :loading="settingsSaving" @click="saveSettings" />
            </template>
        </Dialog>

        <Dialog v-model:visible="noteVisible" modal :header="`Заметка: ${selectedAdmin?.name || ''}`" :style="{ width: '40rem' }">
            <div class="flex flex-col gap-4">
                <label class="flex items-center gap-2">
                    <Checkbox v-model="watchedDraft" binary />
                    <span>Поставить на контроль</span>
                </label>
                <div>
                    <label class="block text-sm mb-2">Заметка руководства</label>
                    <Textarea v-model="noteDraft" rows="6" class="w-full" placeholder="Например: проследить активность, проверить карточки, поговорить по норме..." />
                </div>
                <div v-if="selectedAdmin?.note_updated_by" class="text-xs text-muted-color">
                    Последнее изменение: {{ selectedAdmin.note_updated_by }}
                </div>
            </div>

            <template #footer>
                <Button label="Отмена" text @click="noteVisible = false" />
                <Button label="Сохранить" icon="pi pi-check" :loading="noteSaving" @click="saveAdminMeta()" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.senior-hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.senior-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.week-select {
    min-width: 17rem;
}

.hidden-toggle {
    min-height: 2.5rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.75rem;
    border: 1px solid var(--surface-border);
    border-radius: 6px;
    color: var(--text-color);
    background: var(--surface-ground);
    cursor: pointer;
}

.senior-summary-card {
    height: 180px;
    min-height: 180px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.65rem;
}

.senior-summary-icon {
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.summary-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
}

.tone-blue {
    color: #60a5fa;
    background: rgba(96, 165, 250, 0.14);
}

.tone-purple {
    color: #a78bfa;
    background: rgba(167, 139, 250, 0.14);
}

.tone-green {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.14);
}

.tone-orange {
    color: #fb923c;
    background: rgba(251, 146, 60, 0.14);
}

.attention-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 0.85rem;
}

.attention-card {
    display: grid;
    grid-template-columns: 2.25rem minmax(0, 1fr);
    gap: 0.75rem;
    width: 100%;
    padding: 0.9rem;
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    color: inherit;
    background: var(--surface-ground);
    cursor: pointer;
}

.attention-card:hover {
    border-color: var(--primary-color);
}

.attention-icon {
    width: 2.25rem;
    height: 2.25rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    color: var(--primary-color);
    background: color-mix(in srgb, var(--primary-color) 16%, transparent);
}

.note-cell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.note-preview {
    max-width: 22rem;
    overflow: hidden;
    color: var(--text-color);
    text-overflow: ellipsis;
    white-space: nowrap;
}

@media (max-width: 900px) {
    .senior-hero {
        align-items: flex-start;
        flex-direction: column;
    }

    .senior-actions,
    .week-select {
        width: 100%;
    }
}
</style>
