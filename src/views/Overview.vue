<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useLayout } from '@/layout/composables/layout';
import api from '@/service/api';

const authStore = useAuthStore();
const { isDarkTheme } = useLayout();
const stats = ref(null);
const history = ref([]);
const historyTotal = ref(0);
const loading = ref(true);
const historyLoading = ref(false);
const historyPage = ref(0);
const historyFilters = ref({ player: '', admin: '', status: '', date: '' });
const collapsed = ref({
    summary: false,
    online: false,
    reports: false,
    history: false
});
const onlineChartData = ref(null);
const onlineChartOptions = ref(null);
const avatarInput = ref(null);
const avatarTarget = ref(null);
const avatarUploading = ref(false);
let refreshInterval = null;

const statusLabels = {
    active_idle: '\u041d\u0435 \u0432\u0437\u044f\u0442',
    active_watched: '\u0412 \u0440\u0430\u0431\u043e\u0442\u0435',
    closed_taken: '\u0417\u0430\u043a\u0440\u044b\u0442 \u0430\u0434\u043c\u0438\u043d\u043e\u043c',
    closed_unanswered: '\u0417\u0430\u043a\u0440\u044b\u0442 \u0431\u0435\u0437 \u0430\u0434\u043c\u0438\u043d\u0430'
};

const metricLabels = {
    active_idle: '\u043f\u0440\u043e\u0441\u0442\u043e\u0439',
    active_watched: '\u0430\u0434\u043c\u0438\u043d \u0441\u043b\u0435\u0434\u0438\u0442',
    closed_taken: '\u0430\u0434\u043c\u0438\u043d \u0441\u043b\u0435\u0434\u0438\u043b',
    closed_unanswered: '\u043f\u0440\u043e\u0441\u0442\u043e\u044f\u043b'
};

const statusOptions = [
    { label: 'Все статусы', value: '' },
    { label: 'Не взят', value: 'active_idle' },
    { label: 'В работе', value: 'active_watched' },
    { label: 'Закрыт админом', value: 'closed_taken' },
    { label: 'Закрыт без админа', value: 'closed_unanswered' }
];

onMounted(async () => {
    await load();
    await loadHistory();
    refreshInterval = setInterval(load, 30 * 1000);
});

onUnmounted(() => {
    clearInterval(refreshInterval);
});

function serverParams() {
    const params = new URLSearchParams();
    if (authStore.currentServer) params.append('server', authStore.currentServer);
    return params;
}

async function load() {
    try {
        const params = serverParams();
        const query = params.toString();
        const { data } = await api.get(`/admin/overview${query ? `?${query}` : ''}`);
        stats.value = data;
        setupOnlineChart();
    } catch {
        // silent fail
    } finally {
        loading.value = false;
    }
}

async function loadHistory() {
    historyLoading.value = true;
    try {
        const params = serverParams();
        params.append('page', historyPage.value);
        if (historyFilters.value.player) params.append('player', historyFilters.value.player);
        if (historyFilters.value.admin) params.append('admin', historyFilters.value.admin);
        if (historyFilters.value.status) params.append('status', historyFilters.value.status);
        if (historyFilters.value.date) params.append('date', historyFilters.value.date);
        const { data } = await api.get(`/admin/reports/history?${params.toString()}`);
        history.value = data.data || [];
        historyTotal.value = data.total || 0;
    } catch {
        history.value = [];
        historyTotal.value = 0;
    } finally {
        historyLoading.value = false;
    }
}

function searchHistory() {
    historyPage.value = 0;
    loadHistory();
}

function clearHistory() {
    historyFilters.value = { player: '', admin: '', status: '', date: '' };
    historyPage.value = 0;
    loadHistory();
}


function statusText(report) {
    return statusLabels[report.status] || report.status_label || '-';
}

function metricText(report) {
    return metricLabels[report.status] || report.metric_label || '\u0432\u0440\u0435\u043c\u044f';
}

function metricClass(report) {
    if (report.status === 'active_idle') return 'text-orange-500';
    if (report.status === 'active_watched') return 'text-blue-500';
    if (report.status === 'closed_taken') return 'text-green-500';
    return 'text-muted-color';
}

function toggleSection(section) {
    collapsed.value[section] = !collapsed.value[section];
}

function setupOnlineChart() {
    if (!stats.value?.online_history?.length) {
        onlineChartData.value = null;
        return;
    }

    const documentStyle = getComputedStyle(document.documentElement);
    const blue = '#60a5fa';
    const purple = documentStyle.getPropertyValue('--p-primary-500') || '#a78bfa';
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border') || '#404040';
    const textMuted = documentStyle.getPropertyValue('--text-color-secondary') || '#a1a1aa';
    const labels = stats.value.online_history.map((row) => row.sampled_at);

    onlineChartData.value = {
        labels,
        datasets: [
            {
                label: 'Игроки',
                data: stats.value.online_history.map((row) => row.players),
                borderColor: blue,
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
                    gradient.addColorStop(0, 'rgba(96, 165, 250, 0.38)');
                    gradient.addColorStop(1, 'rgba(96, 165, 250, 0.04)');
                    return gradient;
                },
                fill: true,
                tension: 0.35,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2
            },
            {
                label: 'Администраторы',
                data: stats.value.online_history.map((row) => row.admins),
                borderColor: purple,
                backgroundColor: 'rgba(168, 85, 247, 0.12)',
                fill: false,
                tension: 0.35,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2
            }
        ]
    };

    onlineChartOptions.value = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    color: textMuted,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    font: { size: 11 }
                }
            },
            tooltip: {
                backgroundColor: isDarkTheme.value ? '#111827' : '#fff',
                titleColor: isDarkTheme.value ? '#fff' : '#111827',
                bodyColor: isDarkTheme.value ? '#d1d5db' : '#374151',
                borderColor: surfaceBorder,
                borderWidth: 1
            }
        },
        scales: {
            x: {
                ticks: { color: textMuted, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
                grid: { color: 'transparent' }
            },
            y: {
                beginAtZero: true,
                ticks: { color: textMuted, font: { size: 10 }, precision: 0 },
                grid: { color: surfaceBorder, drawBorder: false }
            }
        }
    };
}

function initials(name) {
    return String(name || '?').slice(0, 2).toUpperCase();
}

const totalOnline = computed(() => (stats.value?.players_online || 0) + (stats.value?.admins_online || 0));
const maxPlayers = computed(() => Math.max(stats.value?.players_online || 0, ...((stats.value?.online_history || []).map((row) => row.players)), 0));

function roleLabelStyle(admin) {
    const color = admin.role_label_color || '#8b5cf6';

    return {
        '--role-label-color': color
    };
}

const canManageOnlineAvatars = computed(() => authStore.isOwner);

function chooseAdminAvatar(admin) {
    if (!canManageOnlineAvatars.value || avatarUploading.value) return;
    avatarTarget.value = admin;
    avatarInput.value?.click();
}

async function uploadAdminAvatar(event) {
    const file = event.target.files?.[0];
    const admin = avatarTarget.value;

    if (!file || !admin) {
        event.target.value = '';
        return;
    }

    avatarUploading.value = true;

    try {
        const form = new FormData();
        form.append('avatar', file);
        if (authStore.currentServer) form.append('server', authStore.currentServer);

        const { data } = await api.post(`/admin/manage/${encodeURIComponent(admin.name)}/avatar`, form, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        const updated = stats.value?.online_admins?.find((item) => item.name === admin.name);
        if (updated) {
            updated.avatar_url = data.avatar_url || null;
        }
    } catch (error) {
        console.warn('admin avatar upload failed:', error.response?.data?.message || error.message);
    } finally {
        avatarUploading.value = false;
        avatarTarget.value = null;
        event.target.value = '';
    }
}

watch(isDarkTheme, () => setupOnlineChart());
</script>

<template>
    <div class="flex flex-col gap-6">
        <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold m-0">Главная</h2>
            <span class="text-sm text-muted-color">Обновляется каждые 30 сек.</span>
        </div>

        <ProgressSpinner v-if="loading" class="flex justify-center py-12" />

        <template v-else-if="stats">
            <input ref="avatarInput" class="hidden" type="file" accept="image/png,image/jpeg,image/webp" @change="uploadAdminAvatar" />

            <div class="section-header">
                <div class="section-title">
                    <i class="pi pi-chart-pie text-primary"></i>
                    <span>Сводка</span>
                </div>
                <Button :icon="collapsed.summary ? 'pi pi-plus' : 'pi pi-minus'" text rounded severity="secondary" @click="toggleSection('summary')" />
            </div>

            <div v-show="!collapsed.summary" class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                <div class="card overview-metric-card">
                    <div class="flex items-center justify-between gap-3">
                        <span class="text-muted-color text-sm font-medium">Игроков онлайн</span>
                        <div class="metric-icon bg-blue-500/10">
                            <i class="pi pi-users text-blue-500 text-lg"></i>
                        </div>
                    </div>
                    <div class="text-4xl font-bold text-blue-500">{{ stats.players_online }}</div>
                    <div class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0"></span>
                        <span class="text-xs text-muted-color">Активных сейчас</span>
                    </div>
                </div>

                <div class="card overview-metric-card">
                    <div class="flex items-center justify-between gap-3">
                        <span class="text-muted-color text-sm font-medium">Администрация онлайн</span>
                        <div class="metric-icon bg-green-500/10">
                            <i class="pi pi-shield text-green-500 text-lg"></i>
                        </div>
                    </div>
                    <div class="text-4xl font-bold text-green-500">{{ stats.admins_online }}</div>
                    <div class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0"></span>
                        <span class="text-xs text-muted-color">Активных сейчас</span>
                    </div>
                </div>

                <div class="card overview-metric-card">
                    <div class="flex items-center justify-between gap-3">
                        <span class="text-muted-color text-sm font-medium leading-tight">Ожидают подтверждения</span>
                        <div class="metric-icon" :class="stats.pending_admins > 0 ? 'bg-orange-500/10' : 'bg-surface-200 dark:bg-surface-700'">
                            <i class="pi pi-clock text-lg" :class="stats.pending_admins > 0 ? 'text-orange-500' : 'text-muted-color'"></i>
                        </div>
                    </div>
                    <div class="text-4xl font-bold" :class="stats.pending_admins > 0 ? 'text-orange-500' : 'text-muted-color'">{{ stats.pending_admins }}</div>
                    <div class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full flex-shrink-0" :class="stats.pending_admins > 0 ? 'bg-orange-500' : 'bg-surface-400'"></span>
                        <span class="text-xs text-muted-color">{{ stats.pending_admins > 0 ? 'Требуют внимания' : 'Всё подтверждено' }}</span>
                    </div>
                </div>
            </div>

            <div class="card flex flex-col gap-4">
                <div class="section-header in-card">
                    <div class="section-title">
                        <i class="pi pi-wave-pulse text-primary"></i>
                        <span>Аналитика онлайна</span>
                        <Tag value="Онлайн" severity="success" size="small" />
                    </div>
                    <Button :icon="collapsed.online ? 'pi pi-plus' : 'pi pi-minus'" text rounded severity="secondary" @click="toggleSection('online')" />
                </div>

                <div v-show="!collapsed.online" class="flex flex-col gap-4">
                    <div class="online-chart-panel">
                        <Chart v-if="onlineChartData" type="line" :data="onlineChartData" :options="onlineChartOptions" class="h-full" />
                        <div v-else class="flex flex-col items-center justify-center h-full text-muted-color">
                            <i class="pi pi-chart-line text-3xl mb-2"></i>
                            <span>История появится после нескольких обновлений</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div class="online-stat-card">
                            <span class="stat-dot bg-blue-400"></span>
                            <div class="text-muted-color text-sm">Игроки</div>
                            <div class="text-2xl font-bold">{{ stats.players_online }}</div>
                            <div class="text-xs text-muted-color">максимум за период: {{ maxPlayers }}</div>
                        </div>

                        <div class="online-stat-card">
                            <span class="stat-dot bg-primary"></span>
                            <div class="text-muted-color text-sm">Администраторы</div>
                            <div class="text-2xl font-bold">{{ stats.admins_online }}</div>
                            <div class="online-admin-list">
                                <div v-for="admin in stats.online_admins" :key="admin.id" class="online-admin-row">
                                    <div class="online-avatar">
                                        <img v-if="admin.avatar_url" :src="admin.avatar_url" :alt="admin.name" />
                                        <span v-else>{{ initials(admin.name) }}</span>
                                    </div>
                                    <div class="min-w-0">
                                        <div class="font-semibold truncate">{{ admin.name }}</div>
                                        <div class="text-xs text-muted-color">Lv {{ admin.level }}{{ admin.is_ga ? '+' : '' }} · за сегодня: {{ admin.today_online }}</div>
                                        <span v-if="admin.role_label" class="online-role-label" :style="roleLabelStyle(admin)">
                                            {{ admin.role_label }}
                                        </span>
                                    </div>
                                    <Button
                                        v-if="canManageOnlineAvatars"
                                        class="online-avatar-action"
                                        icon="pi pi-camera"
                                        text
                                        rounded
                                        severity="secondary"
                                        :loading="avatarUploading && avatarTarget?.name === admin.name"
                                        title="Изменить аватар"
                                        @click.stop="chooseAdminAvatar(admin)"
                                    />
                                </div>
                                <div v-if="!stats.online_admins?.length" class="text-sm text-muted-color py-2">Администраторов онлайн нет</div>
                            </div>
                        </div>

                        <div class="online-stat-card">
                            <span class="stat-dot bg-green-400"></span>
                            <div class="text-muted-color text-sm">Общий онлайн</div>
                            <div class="text-2xl font-bold">{{ totalOnline }}</div>
                            <div class="text-xs text-muted-color">игроки + администрация</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card flex flex-col gap-4">
                <div class="section-header in-card">
                    <div class="section-title">
                        <i class="pi pi-flag text-red-500 text-xl"></i>
                        <span>Активные репорты</span>
                        <span class="text-muted-color text-sm">? всего: <span class="font-semibold text-surface-900 dark:text-surface-100">{{ stats.reports_count }}</span></span>
                    </div>
                    <Button :icon="collapsed.reports ? 'pi pi-plus' : 'pi pi-minus'" text rounded severity="secondary" @click="toggleSection('reports')" />
                </div>

                <div v-show="!collapsed.reports" class="flex flex-col gap-4">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div class="p-3 bg-surface-100 dark:bg-surface-800 rounded-lg"><div class="text-xs text-muted-color">За сегодня</div><div class="text-2xl font-bold text-primary">{{ stats.report_wait_stats?.today_total || 0 }}</div></div>
                        <div class="p-3 bg-surface-100 dark:bg-surface-800 rounded-lg"><div class="text-xs text-muted-color">Не взяты</div><div class="text-2xl font-bold text-orange-500">{{ stats.report_wait_stats?.active_idle || 0 }}</div></div>
                        <div class="p-3 bg-surface-100 dark:bg-surface-800 rounded-lg"><div class="text-xs text-muted-color">В работе</div><div class="text-2xl font-bold text-blue-500">{{ stats.report_wait_stats?.active_watched || 0 }}</div></div>
                    </div>

                    <div v-if="stats.reports && stats.reports.length" class="flex flex-col">
                        <div v-for="(r, i) in stats.reports" :key="r.id" class="flex items-start gap-3 py-2.5 border-b border-surface-200 dark:border-surface-700 last:border-0">
                            <span class="text-muted-color text-sm w-5 flex-shrink-0 mt-0.5">{{ i + 1 }})</span>
                            <span class="text-sm leading-relaxed">
                                От игрока <span class="font-semibold text-primary">{{ r.from }}</span>
                                на игрока <span class="font-semibold text-red-400">{{ r.on }}</span>
                                <template v-if="r.admin"> - взят админом <span class="font-semibold text-green-400">{{ r.admin }}</span></template>
                                <template v-else><span class="text-muted-color"> - {{ statusText(r) }}</span></template>
                                <span class="text-muted-color"> - {{ metricText(r) }} </span>
                                <span class="font-semibold" :class="metricClass(r)">{{ r.metric_time }}</span>
                            </span>
                        </div>
                    </div>
                    <div v-else class="text-muted-color text-sm py-2">Активных репортов нет</div>
                </div>
            </div>

            <div class="card flex flex-col gap-4">
                <div class="section-header in-card">
                    <div class="section-title">
                        <i class="pi pi-history text-primary text-xl"></i>
                        <span class="font-semibold text-lg">История репортов</span>
                        <span class="text-muted-color text-sm">? всего: {{ historyTotal }}</span>
                    </div>
                    <Button :icon="collapsed.history ? 'pi pi-plus' : 'pi pi-minus'" text rounded severity="secondary" @click="toggleSection('history')" />
                </div>

                <div v-show="!collapsed.history" class="flex flex-col gap-4">
                    <div class="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                        <div class="flex flex-col gap-2"><label>Игрок</label><InputText v-model="historyFilters.player" placeholder="Nick" @keyup.enter="searchHistory" /></div>
                        <div class="flex flex-col gap-2"><label>Админ</label><InputText v-model="historyFilters.admin" placeholder="Admin" @keyup.enter="searchHistory" /></div>
                        <div class="flex flex-col gap-2"><label>Статус</label><Select v-model="historyFilters.status" :options="statusOptions" optionLabel="label" optionValue="value" /></div>
                        <div class="flex flex-col gap-2"><label>Дата</label><InputText v-model="historyFilters.date" placeholder="YYYY-MM-DD" @keyup.enter="searchHistory" /></div>
                        <div class="flex gap-2"><Button :label="'Поиск'" icon="pi pi-search" @click="searchHistory" /><Button :label="'Очистить'" severity="secondary" outlined @click="clearHistory" /></div>
                    </div>

                    <ProgressSpinner v-if="historyLoading" class="flex justify-center py-6" />
                    <div v-else-if="history.length" class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="text-left text-muted-color border-b border-surface-200 dark:border-surface-700">
                                    <th class="py-2 pr-3">ID</th><th class="py-2 pr-3">Появился</th><th class="py-2 pr-3">Игрок</th><th class="py-2 pr-3">Админ</th><th class="py-2 pr-3">Статус</th><th class="py-2 pr-3">Реакция</th><th class="py-2 pr-3">Следил</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in history" :key="row.id" class="border-b border-surface-100 dark:border-surface-800 last:border-0">
                                    <td class="py-2 pr-3 font-mono">#{{ row.id }}</td>
                                    <td class="py-2 pr-3 whitespace-nowrap">{{ row.created_label }}</td>
                                    <td class="py-2 pr-3"><span class="text-primary font-medium">{{ row.from }}</span> - <span class="text-red-400 font-medium">{{ row.on }}</span></td>
                                    <td class="py-2 pr-3">{{ row.admin || '-' }}</td>
                                    <td class="py-2 pr-3">{{ statusText(row) }}</td>
                                    <td class="py-2 pr-3 font-semibold">{{ row.response_time || '-' }}</td>
                                    <td class="py-2 pr-3 font-semibold" :class="metricClass(row)">{{ row.watch_time || row.idle_time || '-' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div v-else class="text-muted-color text-sm py-2">Истории пока нет</div>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
}

.section-header.in-card {
    margin-bottom: 0.25rem;
}

.section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    font-size: 1.125rem;
    font-weight: 700;
}

.overview-metric-card {
    min-height: 144px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.75rem;
}

.metric-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.online-chart-panel {
    min-height: 260px;
    height: 260px;
    border-radius: 8px;
    padding: 0.75rem;
    background: color-mix(in srgb, var(--surface-card), var(--surface-ground) 30%);
    border: 1px solid var(--surface-border);
}

.online-stat-card {
    min-height: 150px;
    position: relative;
    border-radius: 8px;
    padding: 1rem;
    background: var(--surface-ground);
    border: 1px solid var(--surface-border);
}

.stat-dot {
    width: 0.55rem;
    height: 0.55rem;
    display: inline-block;
    border-radius: 999px;
    margin-bottom: 0.75rem;
}

.online-admin-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.75rem;
    max-height: 190px;
    overflow-y: auto;
    padding-right: 0.25rem;
}

.online-admin-row {
    display: grid;
    grid-template-columns: 2rem minmax(0, 1fr) 2rem;
    align-items: center;
    gap: 0.6rem;
}

.online-avatar {
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--p-primary-500), transparent 78%);
    color: var(--p-primary-contrast-color);
    font-size: 0.72rem;
    font-weight: 800;
}

.online-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.online-avatar-action {
    width: 2rem;
    height: 2rem;
    min-width: 2rem;
}

.online-role-label {
    display: inline-flex;
    width: fit-content;
    max-width: 100%;
    margin-top: 0.25rem;
    padding: 0.12rem 0.45rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--role-label-color), transparent 35%);
    background: color-mix(in srgb, var(--role-label-color), transparent 82%);
    color: color-mix(in srgb, var(--role-label-color), white 24%);
    font-size: 0.68rem;
    font-weight: 700;
    line-height: 1.2;
    white-space: normal;
}
</style>
