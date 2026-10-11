<script setup>
import { computed, onMounted, ref } from 'vue';
import api from '@/service/api';

const loading = ref(true);
const error = ref('');
const updatedAt = ref(null);
const servers = ref([]);
const selectedServer = ref('all');

const serverOptions = computed(() => [
    { label: 'Все серверы', value: 'all' },
    ...servers.value.map((server) => ({ label: server.label, value: server.key }))
]);

const visibleServers = computed(() => {
    if (selectedServer.value === 'all') {
        return servers.value;
    }

    return servers.value.filter((server) => server.key === selectedServer.value);
});

const totals = computed(() => {
    return servers.value.reduce(
        (acc, server) => {
            acc.current += server.current_count || 0;
            acc.day += server.stats?.day || 0;
            acc.week += server.stats?.week || 0;
            acc.month += server.stats?.month || 0;
            acc.takenSeconds += (server.metrics?.avg_taken_seconds || 0) * (server.metrics?.taken_count || 0);
            acc.takenCount += server.metrics?.taken_count || 0;
            acc.pendingSeconds += (server.metrics?.avg_pending_seconds || 0) * (server.metrics?.pending_count || 0);
            acc.pendingCount += server.metrics?.pending_count || 0;
            return acc;
        },
        { current: 0, day: 0, week: 0, month: 0, takenSeconds: 0, takenCount: 0, pendingSeconds: 0, pendingCount: 0 }
    );
});

const averageTakenLabel = computed(() => {
    if (!totals.value.takenCount) return '—';

    return durationLabel(Math.round(totals.value.takenSeconds / totals.value.takenCount));
});

const averagePendingLabel = computed(() => {
    if (!totals.value.pendingCount) return '—';

    return durationLabel(Math.round(totals.value.pendingSeconds / totals.value.pendingCount));
});

onMounted(load);

async function load() {
    loading.value = true;
    error.value = '';

    try {
        const { data } = await api.get('/admin/forum/complaints');
        servers.value = data.servers || [];
        updatedAt.value = data.updated_at || null;
    } catch {
        error.value = 'Не удалось получить данные форума.';
        servers.value = [];
    } finally {
        loading.value = false;
    }
}

function statusSeverity(status) {
    const value = String(status || '').toLowerCase();

    if (value.includes('обработ') || value.includes('processing')) return 'info';
    if (value.includes('одоб') || value.includes('accept') || value.includes('approved')) return 'success';
    if (value.includes('отказ') || value.includes('reject') || value.includes('denied')) return 'danger';
    if (value.includes('закры')) return 'secondary';
    return 'warn';
}

function empty(value, fallback = '—') {
    return value || fallback;
}

function durationLabel(seconds) {
    seconds = Math.max(0, Number(seconds || 0));
    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);

    if (days > 0) return `${days}д ${hours}ч`;
    if (hours > 0) return `${hours}ч ${minutes}м`;
    return `${minutes}м`;
}
</script>

<template>
    <div class="flex flex-col gap-6">
        <div class="card">
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div class="text-sm text-muted-color mb-2">Форум</div>
                    <h1 class="text-3xl font-bold m-0">Жалобы по серверам</h1>
                    <p class="text-muted-color mt-3 mb-0">Сводка по разделам жалоб XenForo: статусы, свежие темы и динамика за период.</p>
                </div>

                <div class="flex flex-col sm:flex-row gap-2">
                    <SelectButton v-model="selectedServer" :options="serverOptions" optionLabel="label" optionValue="value" />
                    <Button icon="pi pi-refresh" label="Обновить" :loading="loading" outlined @click="load" />
                </div>
            </div>
        </div>

        <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

        <div class="forum-summary-grid">
            <div class="card mb-0">
                <div class="text-muted-color text-sm mb-2">Открыто сейчас</div>
                <div class="text-3xl font-bold">{{ totals.current }}</div>
            </div>
            <div class="card mb-0">
                <div class="text-muted-color text-sm mb-2">За день</div>
                <div class="text-3xl font-bold text-green-500">{{ totals.day }}</div>
            </div>
            <div class="card mb-0">
                <div class="text-muted-color text-sm mb-2">За неделю</div>
                <div class="text-3xl font-bold text-blue-500">{{ totals.week }}</div>
            </div>
            <div class="card mb-0">
                <div class="text-muted-color text-sm mb-2">За месяц</div>
                <div class="text-3xl font-bold text-orange-500">{{ totals.month }}</div>
            </div>
            <div class="card mb-0">
                <div class="text-muted-color text-sm mb-2">Среднее взятие</div>
                <div class="text-3xl font-bold text-cyan-500">{{ averageTakenLabel }}</div>
                <div class="text-muted-color text-xs mt-2">{{ totals.takenCount }} взято</div>
            </div>
            <div class="card mb-0">
                <div class="text-muted-color text-sm mb-2">Без рассмотрения</div>
                <div class="text-3xl font-bold text-red-500">{{ averagePendingLabel }}</div>
                <div class="text-muted-color text-xs mt-2">{{ totals.pendingCount }} висит</div>
            </div>
        </div>

        <div v-if="loading" class="card">
            <Skeleton height="2rem" class="mb-3" />
            <Skeleton height="12rem" />
        </div>

        <template v-else>
            <div v-for="server in visibleServers" :key="server.key" class="card">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-5">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <h2 class="text-2xl font-bold m-0">{{ server.label }}</h2>
                            <Tag :value="`${server.current_count} открыто`" severity="info" />
                        </div>
                        <a :href="server.url" target="_blank" rel="noopener noreferrer" class="text-primary text-sm">Открыть раздел форума</a>
                    </div>

                    <div class="server-metrics-grid">
                        <div class="forum-mini-stat">
                            <span>День</span>
                            <strong>{{ server.stats?.day || 0 }}</strong>
                        </div>
                        <div class="forum-mini-stat">
                            <span>Неделя</span>
                            <strong>{{ server.stats?.week || 0 }}</strong>
                        </div>
                        <div class="forum-mini-stat">
                            <span>Месяц</span>
                            <strong>{{ server.stats?.month || 0 }}</strong>
                        </div>
                        <div class="forum-mini-stat">
                            <span>Среднее взятие</span>
                            <strong>{{ server.metrics?.avg_taken_label || '—' }}</strong>
                        </div>
                        <div class="forum-mini-stat">
                            <span>Без рассмотрения</span>
                            <strong>{{ server.metrics?.avg_pending_label || '—' }}</strong>
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap gap-2 mb-5">
                    <Tag
                        v-for="status in server.status_counts"
                        :key="`${server.key}-${status.status}`"
                        :value="`${status.status}: ${status.count}`"
                        :severity="statusSeverity(status.status)"
                    />
                    <span v-if="!server.status_counts?.length" class="text-muted-color text-sm">Открытых жалоб нет.</span>
                </div>

                <DataTable :value="server.recent || []" stripedRows responsiveLayout="scroll" class="forum-complaints-table">
                    <Column header="Тема" style="min-width: 18rem">
                        <template #body="{ data }">
                            <a v-if="data.url" :href="data.url" target="_blank" rel="noopener noreferrer" class="font-semibold text-primary">{{ data.title }}</a>
                            <span v-else class="font-semibold">{{ data.title }}</span>
                            <div class="text-muted-color text-xs mt-1">Автор: {{ empty(data.author) }}</div>
                        </template>
                    </Column>
                    <Column header="Статус" style="min-width: 9rem">
                        <template #body="{ data }">
                            <Tag :value="data.status" :severity="statusSeverity(data.status)" />
                        </template>
                    </Column>
                    <Column header="Создана" style="min-width: 8rem">
                        <template #body="{ data }">{{ empty(data.created_at) }}</template>
                    </Column>
                    <Column header="Взята" style="min-width: 10rem">
                        <template #body="{ data }">
                            <div>{{ empty(data.taken_at) }}</div>
                            <div v-if="data.taken_by" class="text-muted-color text-xs mt-1">{{ data.taken_by }}</div>
                        </template>
                    </Column>
                    <Column header="Последний ответ" style="min-width: 10rem">
                        <template #body="{ data }">
                            <div>{{ empty(data.last_reply_at) }}</div>
                            <div class="text-muted-color text-xs mt-1">{{ empty(data.last_reply_by) }}</div>
                        </template>
                    </Column>
                    <Column header="Ответов" field="replies" style="width: 6rem" />
                    <template #empty>
                        <div class="text-center text-muted-color py-6">Свежих открытых жалоб нет.</div>
                    </template>
                </DataTable>
            </div>
        </template>

        <div v-if="updatedAt" class="text-muted-color text-sm">Обновлено: {{ updatedAt }} МСК</div>
    </div>
</template>

<style scoped>
.forum-summary-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 1rem;
}

.forum-summary-grid > .card {
    min-width: 0;
    height: 100%;
}

.forum-mini-stat {
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    padding: 0.75rem;
    background: color-mix(in srgb, var(--surface-card) 92%, var(--primary-color) 8%);
}

.server-metrics-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(6.5rem, 1fr));
    gap: 0.75rem;
    min-width: min(100%, 32rem);
}

.forum-mini-stat span {
    display: block;
    color: var(--text-color-secondary);
    font-size: 0.75rem;
    margin-bottom: 0.25rem;
}

.forum-mini-stat strong {
    font-size: 1.35rem;
}

.forum-complaints-table :deep(.p-datatable-tbody > tr > td) {
    vertical-align: top;
}

@media (max-width: 991px) {
    .forum-summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .server-metrics-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        width: 100%;
    }
}

@media (max-width: 575px) {
    .forum-summary-grid {
        grid-template-columns: 1fr;
    }
}
</style>
