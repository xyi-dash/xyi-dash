<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useLayout } from '@/layout/composables/layout';
import { useToast } from 'primevue/usetoast';
import api from '@/service/api';
import AdminWorkStats from '@/components/AdminWorkStats.vue';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();
const { isDarkTheme } = useLayout();

const loading = ref(true);
const recentActionsLoading = ref(false);
const recentActions = ref([]);
const recentActionsTotal = ref(0);
const workStats = ref(null);
const executing = ref(false);
const updatingLogAccess = ref(false);
const updatingReputationAccess = ref(false);
const updatingRoleLabel = ref(false);
const updatingPlayerEditAccess = ref(false);
const reputationSaving = ref(false);
const canManageReputation = ref(false);
const reputationDraft = ref({ up: 0, down: 0 });
const admin = ref(null);
const actions = ref([]);
const selectedAction = ref('');
const reason = ref('');
const canManageLogAccess = ref(false);
const canManageRoleLabel = ref(false);
const canManagePlayerEdit = ref(false);
const playerEditPermission = ref({ enabled: false, fields: [] });
const playerEditFields = ref([]);
const pointsLoading = ref(false);
const pointsSaving = ref(false);
const pointsData = ref(null);
const pointsMode = ref('add');
const pointsAmount = ref(1);
const pointsLabels = {
    title: '\u0411\u0430\u043b\u043b\u044b',
    current: '\u0422\u0435\u043a\u0443\u0449\u0438\u0435',
    max: '\u041c\u0430\u043a\u0441.',
    amount: '\u041a\u043e\u043b-\u0432\u043e',
    apply: '\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c',
    unavailable: '\u0411\u0430\u043b\u043b\u044b \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b',
    updated: '\u0411\u0430\u043b\u043b\u044b \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u044b',
    failed: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0431\u0430\u043b\u043b\u044b',
    syncWarning: '\u0411\u0430\u043b\u043b\u044b \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u044b, \u043d\u043e Google Sheets \u043d\u0435 \u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u043b\u0438\u0441\u044c',
    modes: [
        { label: '+', value: 'add' },
        { label: '-', value: 'subtract' },
        { label: '=', value: 'set' }
    ]
};
const recentLabels = {
    title: '\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430',
    subtitle: '\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u044e\u0442\u0441\u044f \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 20 \u0441\u0442\u0440\u043e\u043a \u0438\u0437 \u043b\u043e\u0433\u043e\u0432 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439 \u043f\u043e \u044d\u0442\u043e\u043c\u0443 \u0430\u0434\u043c\u0438\u043d\u0443.',
    openAll: '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0432\u0441\u0435 \u043b\u043e\u0433\u0438',
    date: '\u0414\u0430\u0442\u0430',
    player: '\u0418\u0433\u0440\u043e\u043a',
    command: '\u041a\u043e\u043c\u0430\u043d\u0434\u0430',
    amount: '\u041a\u043e\u043b-\u0432\u043e',
    reason: '\u041f\u0440\u0438\u0447\u0438\u043d\u0430',
    empty: '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0439 \u043f\u043e \u044d\u0442\u043e\u043c\u0443 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0443 \u0437\u0430 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 30 \u0434\u043d\u0435\u0439 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e',
    total: '\u041d\u0430\u0439\u0434\u0435\u043d\u043e \u0432\u0441\u0435\u0433\u043e',
    hint: '\u0414\u043b\u044f \u043f\u043e\u043b\u043d\u043e\u0433\u043e \u0441\u043f\u0438\u0441\u043a\u0430 \u043e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443 \u043b\u043e\u0433\u043e\u0432.'
};

const interactionDialogVisible = ref(false);
const interactionHistoryLoading = ref(false);
const interactionHistory = ref([]);
const interactionLabels = {
    button: "\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0432\u0437\u0430\u0438\u043c\u043e\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439",
    title: "\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0432\u0437\u0430\u0438\u043c\u043e\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439",
    subtitle: "\u041f\u0440\u0435\u0434\u0443\u043f\u0440\u0435\u0436\u0434\u0435\u043d\u0438\u044f, \u043f\u043e\u0432\u044b\u0448\u0435\u043d\u0438\u044f, \u043f\u043e\u043d\u0438\u0436\u0435\u043d\u0438\u044f \u0438 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0431\u0430\u043b\u043b\u043e\u0432 \u043f\u043e \u044d\u0442\u043e\u043c\u0443 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0443.",
    date: "\u0414\u0430\u0442\u0430",
    action: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435",
    actor: "\u041a\u0442\u043e \u0441\u0434\u0435\u043b\u0430\u043b",
    target: "\u041a\u043e\u043c\u0443",
    details: "\u0414\u0435\u0442\u0430\u043b\u0438",
    reason: "\u041f\u0440\u0438\u0447\u0438\u043d\u0430",
    empty: "\u0418\u0441\u0442\u043e\u0440\u0438\u0438 \u0432\u0437\u0430\u0438\u043c\u043e\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442",
    copy: "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0441\u0442\u0440\u043e\u043a\u0443",
    warn: "\u0412\u044b\u0434\u0430\u043b \u043f\u0440\u0435\u0434",
    unwarn: "\u0421\u043d\u044f\u043b \u043f\u0440\u0435\u0434",
    promote: "\u041f\u043e\u0432\u044b\u0441\u0438\u043b",
    demote: "\u041f\u043e\u043d\u0438\u0437\u0438\u043b",
    points: "\u0418\u0437\u043c\u0435\u043d\u0438\u043b \u0431\u0430\u043b\u043b\u044b",
    reputation: "\u0418\u0437\u043c\u0435\u043d\u0438\u043b \u0440\u0435\u043f\u0443\u0442\u0430\u0446\u0438\u044e",
    unknown: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435",
    failed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0438\u0441\u0442\u043e\u0440\u0438\u044e \u0432\u0437\u0430\u0438\u043c\u043e\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439",
};
const interactionActionLabels = {
    warn: interactionLabels.warn,
    unwarn: interactionLabels.unwarn,
    promote: interactionLabels.promote,
    demote: interactionLabels.demote,
    points: interactionLabels.points,
    reputation: interactionLabels.reputation
};
const normHistory = ref(null);
const chartData = ref(null);
const chartOptions = ref(null);

// these actions need reasons. unlike my decisions to work in frontend. those need therapy.
const actionsNeedingReason = ['warn', 'unwarn', 'promote', 'demote', 'remove', 'give_ga', 'remove_ga'];

const canShowLogAccessToggle = computed(() => {
    if (!admin.value || Number(admin.value.level) !== 6 || admin.value.is_ga) return false;
    return canManageLogAccess.value || authStore.admin?.level >= 7 || actions.value.includes('promote') || actions.value.includes('give_ga');
});

const getActionLabel = (action) => t(`manage.action_labels.${action}`);

onMounted(async () => {
    await loadAdminData();
    await loadAdminPoints();
    await loadNormHistory();
    await loadRecentActions();
    await loadWorkStats();
});

async function loadAdminData() {
    loading.value = true;
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        const { data } = await api.get(`/admin/manage/${encodeURIComponent(route.params.name)}/actions${serverParam}`);
        admin.value = data.admin;
        admin.value.role_label_color = admin.value.role_label_color || '#8b5cf6';
        admin.value.reputation = admin.value.reputation || { up: 0, down: 0 };
        reputationDraft.value = {
            up: Number(admin.value.reputation?.up || 0),
            down: Number(admin.value.reputation?.down || 0)
        };
        actions.value = data.actions;
        canManageLogAccess.value = data.can_manage_log_access || false;
        canManageRoleLabel.value = data.can_manage_role_label || false;
        canManagePlayerEdit.value = data.can_manage_player_edit || false;
        canManageReputation.value = data.can_manage_reputation || false;
        playerEditPermission.value = data.player_edit_permission || { enabled: false, fields: [] };
        playerEditFields.value = data.player_edit_fields || [];
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: t('common.error'),
            detail: t('common.failed_load'),
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

async function loadAdminPoints() {
    if (!admin.value) return;

    pointsLoading.value = true;
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        const { data } = await api.get(`/admin/manage/${encodeURIComponent(admin.value.name)}/points${serverParam}`);
        pointsData.value = {
            points: Number(data.points || 0),
            max: Number(data.max_points || 200)
        };
    } catch (error) {
        pointsData.value = null;
    } finally {
        pointsLoading.value = false;
    }
}

async function updateRoleLabel() {
    if (!admin.value || !canManageRoleLabel.value) return;

    updatingRoleLabel.value = true;
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        const { data } = await api.patch(`/admin/manage/${encodeURIComponent(admin.value.name)}/role-label${serverParam}`, {
            role_label: admin.value.role_label || '',
            role_label_color: admin.value.role_label_color || '#8b5cf6'
        });

        admin.value.role_label = data.role_label || null;
        admin.value.role_label_color = data.role_label_color || '#8b5cf6';
        toast.add({
            severity: 'success',
            summary: t('common.success'),
            detail: 'Лейбл администратора обновлен',
            life: 2500
        });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: t('common.error'),
            detail: error.response?.data?.message || 'Не удалось обновить лейбл',
            life: 4000
        });
    } finally {
        updatingRoleLabel.value = false;
    }
}

async function updatePlayerEditAccess() {
    if (!admin.value || !canManagePlayerEdit.value) return;

    updatingPlayerEditAccess.value = true;
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        const { data } = await api.patch(`/admin/manage/${encodeURIComponent(admin.value.name)}/player-edit${serverParam}`, {
            enabled: !!playerEditPermission.value.enabled,
            fields: playerEditPermission.value.fields || []
        });

        playerEditPermission.value = data.permission || { enabled: false, fields: [] };

        toast.add({
            severity: 'success',
            summary: t('common.success'),
            detail: 'Доступ к редактированию игроков обновлен',
            life: 3000
        });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: t('common.error'),
            detail: error.response?.data?.message || 'Не удалось обновить доступ к редактированию игроков',
            life: 5000
        });
    } finally {
        updatingPlayerEditAccess.value = false;
    }
}

async function updateAdminReputation() {
    if (!admin.value || !canManageReputation.value || reputationSaving.value) return;

    const repUp = Number(reputationDraft.value.up || 0);
    const repDown = Number(reputationDraft.value.down || 0);
    if (repUp < 0 || repDown < 0) {
        toast.add({ severity: 'error', summary: t('common.error'), detail: 'Репутация не может быть отрицательной', life: 3000 });
        return;
    }

    reputationSaving.value = true;
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        const { data } = await api.patch(`/admin/manage/${encodeURIComponent(admin.value.name)}/reputation${serverParam}`, {
            rep_up: repUp,
            rep_down: repDown
        });
        if (data.admin) {
            admin.value = data.admin;
            admin.value.role_label_color = admin.value.role_label_color || '#8b5cf6';
            admin.value.reputation = admin.value.reputation || { up: 0, down: 0 };
            reputationDraft.value = {
                up: Number(admin.value.reputation?.up || 0),
                down: Number(admin.value.reputation?.down || 0)
            };
        }
        if (interactionDialogVisible.value) await loadInteractionHistory();
        toast.add({ severity: 'success', summary: t('common.success'), detail: 'Репутация обновлена', life: 2500 });
    } catch (error) {
        toast.add({ severity: 'error', summary: t('common.error'), detail: error.response?.data?.message || 'Не удалось обновить репутацию', life: 4000 });
    } finally {
        reputationSaving.value = false;
    }
}

async function updateAdminPoints() {
    if (!admin.value || pointsSaving.value) return;

    const amount = Number(pointsAmount.value || 0);
    if (amount < 0) return;

    pointsSaving.value = true;
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        const { data } = await api.post(`/admin/manage/${encodeURIComponent(admin.value.name)}/points${serverParam}`, {
            mode: pointsMode.value,
            amount
        });

        pointsData.value = {
            points: Number(data.points || 0),
            max: Number(data.max_points || pointsData.value?.max || 200)
        };

        toast.add({
            severity: data.sync && data.sync.enabled && data.sync.success === false ? 'warn' : 'success',
            summary: data.sync && data.sync.enabled && data.sync.success === false ? t('common.warning') : t('common.success'),
            detail: data.sync && data.sync.enabled && data.sync.success === false ? pointsLabels.syncWarning : pointsLabels.updated,
            life: 3500
        });

        await loadWorkStats();
    } catch (error) {
        const err = error.response?.data?.error;
        const max = error.response?.data?.max_points;
        const detail = err === 'points_above_max' && max
            ? `${pointsLabels.failed}: ${String.fromCharCode(1084,1072,1082,1089,1080,1084,1091,1084)} ${max}`
            : pointsLabels.failed;

        toast.add({
            severity: 'error',
            summary: t('common.error'),
            detail,
            life: 5000
        });
    } finally {
        pointsSaving.value = false;
    }
}

async function loadNormHistory() {
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        const { data } = await api.get(`/admin/manage/${encodeURIComponent(route.params.name)}/norm-history${serverParam}`);
        normHistory.value = data;
        setupChart();
    } catch (error) {
        // chart stays empty. such is life...
    }
}


async function loadInteractionHistory() {
    if (!admin.value) return;

    interactionHistoryLoading.value = true;
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}&limit=50` : '?limit=50';
        const { data } = await api.get(`/admin/manage/${encodeURIComponent(admin.value.name)}/history${serverParam}`);
        interactionHistory.value = data.data || data.logs || [];
    } catch (error) {
        interactionHistory.value = [];
        toast.add({
            severity: 'error',
            summary: t('common.error'),
            detail: interactionLabels.failed,
            life: 4000
        });
    } finally {
        interactionHistoryLoading.value = false;
    }
}

async function openInteractionHistory() {
    interactionDialogVisible.value = true;
    await loadInteractionHistory();
}

function interactionActionLabel(row) {
    return interactionActionLabels[row.action_label] || interactionActionLabels[row.action] || row.action_label || row.action || interactionLabels.unknown;
}

function copyInteraction(row) {
    const text = `${row.date || '-'} | ${interactionActionLabel(row)} | ${row.actor || '-'} -> ${row.target || '-'} | ${row.summary || '-'} | ${row.reason || '-'}`;
    navigator.clipboard.writeText(text);
    toast.add({ severity: 'success', summary: t('common.copied'), life: 2000 });
}

async function loadWorkStats() {
    if (!admin.value || Number(admin.value.level) < 6) return;

    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        const { data } = await api.get(`/admin/manage/${encodeURIComponent(admin.value.name)}/work-stats${serverParam}`);
        workStats.value = data;
    } catch (error) {
        workStats.value = null;
    }
}

async function loadRecentActions() {
    if (!authStore.canViewAdminActions) return;

    recentActionsLoading.value = true;
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}&limit=20` : '?limit=20';
        const { data } = await api.get(`/admin/manage/${encodeURIComponent(route.params.name)}/recent-actions${serverParam}`);
        recentActions.value = data.data || [];
        recentActionsTotal.value = data.total || 0;
    } catch (error) {
        recentActions.value = [];
        recentActionsTotal.value = 0;
    } finally {
        recentActionsLoading.value = false;
    }
}

function openAdminLogs() {
    router.push({ name: 'logs-actions', query: { admin: admin.value?.name || route.params.name } });
}

function copyRecentAction(row) {
    const text = `${row.admin} | ${row.player} | ${row.cmd} | ${row.amount} | ${row.reason} | ${row.date}`;
    navigator.clipboard.writeText(text);
    toast.add({ severity: 'success', summary: t('common.copied'), life: 2000 });
}

function setupChart() {
    if (!normHistory.value?.history) return;

    const documentStyle = getComputedStyle(document.documentElement);
    const primaryColor = documentStyle.getPropertyValue('--p-primary-500') || '#10b981';
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border') || '#404040';
    const textMuted = documentStyle.getPropertyValue('--text-color-secondary') || '#a1a1aa';

    const dateFormatter = new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' });
    const labels = normHistory.value.history.map((h) => {
        const date = new Date(h.date);
        return dateFormatter.format(date);
    });

    // same again online's in secs norm_required mins
    const values = normHistory.value.history.map((h) => Math.round((h.online / 3600) * 10) / 10);
    const normLine = normHistory.value.norm_required / 60;

    chartData.value = {
        labels,
        datasets: [
            {
                label: t('charts.online_hours'),
                data: values,
                fill: true,
                borderColor: primaryColor,
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 140);
                    gradient.addColorStop(0, `${primaryColor}50`);
                    gradient.addColorStop(1, `${primaryColor}05`);
                    return gradient;
                },
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointBackgroundColor: primaryColor,
                borderWidth: 2
            },
            {
                label: t('charts.norm'),
                data: Array(labels.length).fill(normLine),
                borderColor: '#ef4444',
                borderDash: [6, 4],
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 0,
                fill: false
            }
        ]
    };

    chartOptions.value = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index'
        },
        layout: {
            padding: { top: 4, bottom: 4 }
        },
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    color: textMuted,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 16,
                    font: { size: 10 }
                }
            },
            tooltip: {
                backgroundColor: isDarkTheme.value ? '#1f2937' : '#fff',
                titleColor: isDarkTheme.value ? '#fff' : '#1f2937',
                bodyColor: isDarkTheme.value ? '#d1d5db' : '#4b5563',
                borderColor: surfaceBorder,
                borderWidth: 1,
                padding: 10,
                callbacks: {
                    label: (ctx) => {
                        const val = Math.round(ctx.raw * 10) / 10;
                        return ` ${ctx.dataset.label}: ${val}${t('charts.hours_short')}`;
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: textMuted,
                    font: { size: 8 },
                    maxRotation: 45,
                    minRotation: 45
                },
                grid: { display: false }
            },
            y: {
                beginAtZero: true,
                suggestedMax: Math.max(...values, normLine) * 1.1,
                ticks: { color: textMuted, font: { size: 10 }, stepSize: 2 },
                grid: { color: surfaceBorder, drawBorder: false }
            }
        }
    };
}

watch([isDarkTheme, locale], () => setupChart());

const weeklyTotal = computed(() => {
    if (!normHistory.value?.history) return 0;
    
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=sun, 1=mon...
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysSinceMonday);
    monday.setHours(0, 0, 0, 0);
    
    const thisWeek = normHistory.value.history.filter((h) => {
        const date = new Date(h.date);
        return date >= monday;
    });
    
    const total = thisWeek.reduce((sum, h) => sum + h.online, 0);
    return Math.round((total / 3600) * 10) / 10;
});

const weeklyNorm = computed(() => {
    if (!normHistory.value?.norm_required) return 0;
    return Math.round((normHistory.value.norm_required * 7 / 60) * 10) / 10;
});

const weeklyMet = computed(() => {
    return weeklyTotal.value >= weeklyNorm.value;
});

async function updateLogAccess(enabled) {
    if (!admin.value || !canShowLogAccessToggle.value) return;

    updatingLogAccess.value = true;
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        const { data } = await api.patch(`/admin/manage/${encodeURIComponent(admin.value.name)}/log-access${serverParam}`, {
            enabled
        });

        admin.value = data.admin;

        toast.add({
            severity: 'success',
            summary: t('common.success'),
            detail: t('manage.log_access_updated'),
            life: 3000
        });
    } catch (error) {
        admin.value.has_log_access = !enabled;
        toast.add({
            severity: 'error',
            summary: t('common.error'),
            detail: t('manage.log_access_failed'),
            life: 5000
        });
    } finally {
        updatingLogAccess.value = false;
    }
}

async function updateReputationAccess(enabled) {
    if (!admin.value || !canShowLogAccessToggle.value) return;

    updatingReputationAccess.value = true;
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        const { data } = await api.patch(`/admin/manage/${encodeURIComponent(admin.value.name)}/reputation-access${serverParam}`, {
            enabled
        });

        admin.value = data.admin;

        toast.add({
            severity: 'success',
            summary: t('common.success'),
            detail: t('manage.reputation_access_updated'),
            life: 3000
        });
    } catch (error) {
        admin.value.has_reputation_access = !enabled;
        toast.add({
            severity: 'error',
            summary: t('common.error'),
            detail: t('manage.reputation_access_failed'),
            life: 5000
        });
    } finally {
        updatingReputationAccess.value = false;
    }
}

async function executeAction() {
    if (!selectedAction.value) return;

    const needsReason = actionsNeedingReason.includes(selectedAction.value);
    if (needsReason && !reason.value.trim()) {
        toast.add({
            severity: 'warn',
            summary: t('common.warning'),
            detail: t('manage.reason_required'),
            life: 3000
        });
        return;
    }

    executing.value = true;
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        const { data } = await api.post(`/admin/manage${serverParam}`, {
            target_name: admin.value.name,
            action: selectedAction.value,
            reason: reason.value || ' '
        });

        toast.add({
            severity: 'success',
            summary: t('common.success'),
            detail: t('manage.success'),
            life: 3000
        });

        admin.value = data.admin;
        selectedAction.value = '';
        reason.value = '';
        await loadAdminData();
        await loadAdminPoints();
        await loadWorkStats();
        await loadRecentActions();
        if (interactionDialogVisible.value) await loadInteractionHistory();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: t('common.error'),
            detail: error.response?.data?.message || t('manage.failed'),
            life: 5000
        });
    } finally {
        executing.value = false;
    }
}

function goBack() {
    router.push({ name: 'admins' });
}
</script>

<template>
    <div class="flex flex-col gap-8">
        <div class="card">
            <div class="flex items-center gap-2">
                <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
                <div class="font-semibold text-xl">{{ $t('manage.title') }}: {{ route.params.name }}</div>
            </div>
        </div>

        <ProgressSpinner v-if="loading" class="flex justify-center py-8" />

        <template v-else-if="admin">
            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 xl:col-span-8">
                    <div class="card h-full">
                        <div class="flex items-center gap-3 mb-6">
                            <span class="text-2xl font-semibold">{{ admin.name }}</span>
                            <span class="w-3 h-3 rounded-full" :class="admin.is_online ? 'bg-green-500' : 'bg-red-400'"></span>
                            <Tag v-if="admin.is_support" severity="info" size="small">{{ $t('admins.support') }}</Tag>
                            <Tag v-if="admin.is_youtuber" severity="warn" size="small">{{ $t('admins.youtuber') }}</Tag>
                            <Tag v-if="admin.is_ga" severity="success" size="small">GA</Tag>
                        </div>

                        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <div class="text-muted-color text-sm mb-1">{{ $t('manage.level') }}</div>
                                <div class="font-semibold text-lg">{{ admin.level }}{{ admin.is_ga ? '+' : '' }}</div>
                            </div>
                            <div>
                                <div class="text-muted-color text-sm mb-1">{{ $t('manage.warnings') }}</div>
                                <div class="font-semibold text-lg" :class="{ 'text-red-500': admin.warnings >= 2 }">{{ admin.warnings }}/3</div>
                            </div>
                            <div>
                                <div class="text-muted-color text-sm mb-1">Репутация</div>
                                <div class="font-semibold text-lg">{{ admin.reputation?.up || 0 }}/{{ admin.reputation?.down || 0 }}</div>
                            </div>
                            <div>
                                <div class="text-muted-color text-sm mb-1">{{ $t('manage.appointed') }}</div>
                                <div class="font-semibold">{{ admin.appointed_date || '—' }}</div>
                            </div>
                            <div>
                                <div class="text-muted-color text-sm mb-1">{{ $t('manage.appointed_by') }}</div>
                                <div class="font-semibold">{{ admin.appointed_by || $t('common.unknown') }}</div>
                            </div>
                            <div>
                                <div class="text-muted-color text-sm mb-1">{{ $t('manage.last_visit') }}</div>
                                <div class="font-semibold">{{ admin.last_online || '—' }}</div>
                            </div>
                            <div>
                                <div class="text-muted-color text-sm mb-1">{{ $t('manage.confirmed') }}</div>
                                <Tag :severity="admin.needs_confirm ? 'warn' : 'success'" size="small">
                                    {{ admin.needs_confirm ? $t('common.no') : $t('common.yes') }}
                                </Tag>
                            </div>
                            <div>
                                <div class="text-muted-color text-sm mb-1">{{ $t('manage.reg_ip') }}</div>
                                <div class="font-mono text-sm">{{ admin.ip_reg || '—' }}</div>
                            </div>
                            <div>
                                <div class="text-muted-color text-sm mb-1">{{ $t('manage.last_ip') }}</div>
                                <div class="font-mono text-sm">{{ admin.ip_last || '—' }}</div>
                            </div>
                        </div>
                        <div v-if="canManageRoleLabel" class="mt-6 pt-4 border-t border-surface-200 dark:border-surface-700">
                            <div class="flex flex-col md:flex-row md:items-end gap-3">
                                <div class="flex flex-col gap-2 md:w-80">
                                    <label for="role-label">Лейбл роли</label>
                                    <InputText
                                        id="role-label"
                                        v-model="admin.role_label"
                                        maxlength="40"
                                        placeholder="Например: Руководитель"
                                        :disabled="updatingRoleLabel"
                                    />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label for="role-label-color">Цвет</label>
                                    <input
                                        id="role-label-color"
                                        v-model="admin.role_label_color"
                                        type="color"
                                        class="role-color-input"
                                        :disabled="updatingRoleLabel"
                                    />
                                </div>
                                <Button label="Сохранить лейбл" icon="pi pi-check" :loading="updatingRoleLabel" @click="updateRoleLabel" />
                                <span class="text-sm text-muted-color">Лейбл виден только в списке админов онлайн.</span>
                            </div>
                        </div>
                        <div v-if="canManageReputation" class="mt-6 pt-4 border-t border-surface-200 dark:border-surface-700">
                            <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                                <div>
                                    <div class="text-muted-color text-sm mb-1">Репутация</div>
                                    <div class="text-2xl font-bold text-primary">{{ admin.reputation?.up || 0 }}/{{ admin.reputation?.down || 0 }}</div>
                                </div>
                                <div class="flex flex-col sm:flex-row sm:items-end gap-3">
                                    <div class="flex flex-col gap-1">
                                        <label class="text-sm text-muted-color">Плюсы</label>
                                        <InputNumber v-model="reputationDraft.up" inputClass="w-24" :min="0" :useGrouping="false" />
                                    </div>
                                    <div class="flex flex-col gap-1">
                                        <label class="text-sm text-muted-color">Минусы</label>
                                        <InputNumber v-model="reputationDraft.down" inputClass="w-24" :min="0" :useGrouping="false" />
                                    </div>
                                    <Button label="Сохранить" icon="pi pi-check" :loading="reputationSaving" size="small" @click="updateAdminReputation" />
                                </div>
                            </div>
                        </div>

                        <div class="mt-6 pt-4 border-t border-surface-200 dark:border-surface-700">
                            <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                                <div>
                                    <div class="text-muted-color text-sm mb-1">{{ pointsLabels.title }}</div>
                                    <div v-if="pointsLoading" class="flex items-center gap-2 text-muted-color">
                                        <i class="pi pi-spin pi-spinner"></i>
                                        <span>{{ pointsLabels.current }}</span>
                                    </div>
                                    <div v-else-if="pointsData" class="flex items-baseline gap-2">
                                        <span class="text-3xl font-bold text-primary">{{ pointsData.points }}</span>
                                        <span class="text-sm text-muted-color">/ {{ pointsData.max }} {{ pointsLabels.max }}</span>
                                    </div>
                                    <div v-else class="text-muted-color">{{ pointsLabels.unavailable }}</div>
                                </div>

                                <div v-if="pointsData" class="flex flex-col sm:flex-row sm:items-end gap-3">
                                    <SelectButton v-model="pointsMode" :options="pointsLabels.modes" optionLabel="label" optionValue="value" :allowEmpty="false" />
                                    <div class="flex flex-col gap-1">
                                        <label class="text-sm text-muted-color">{{ pointsLabels.amount }}</label>
                                        <InputNumber v-model="pointsAmount" inputClass="w-24" :min="0" :max="pointsData.max" :useGrouping="false" />
                                    </div>
                                    <Button :label="pointsLabels.apply" icon="pi pi-check" :loading="pointsSaving" size="small" @click="updateAdminPoints" />
                                </div>
                            </div>
                        </div>

                        <div v-if="canManagePlayerEdit" class="mt-6 pt-4 border-t border-surface-200 dark:border-surface-700">
                            <div class="flex flex-col gap-3">
                                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div>
                                        <div class="font-semibold">Редакт игроков</div>
                                        <div class="text-sm text-muted-color">Доступ для 7 уровня к редактированию аккаунтов игроков.</div>
                                    </div>
                                    <label class="flex items-center gap-2 cursor-pointer select-none">
                                        <Checkbox v-model="playerEditPermission.enabled" :binary="true" :disabled="updatingPlayerEditAccess" />
                                        <span class="text-sm text-muted-color">Выдать доступ</span>
                                    </label>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                                    <div class="flex flex-col gap-2">
                                        <label>Какие поля можно редактировать</label>
                                        <MultiSelect
                                            v-model="playerEditPermission.fields"
                                            :options="playerEditFields"
                                            optionLabel="label"
                                            optionValue="key"
                                            display="chip"
                                            class="w-full"
                                            placeholder="Выберите поля"
                                            :disabled="!playerEditPermission.enabled || updatingPlayerEditAccess"
                                        />
                                    </div>
                                    <Button label="Сохранить доступ" icon="pi pi-check" :loading="updatingPlayerEditAccess" @click="updatePlayerEditAccess" />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div class="col-span-12 xl:col-span-4">
                    <div class="card h-full">
                        <div class="font-semibold text-xl mb-4">{{ $t('manage.online_time') }}</div>
                        <ul class="list-none p-0 m-0">
                            <li class="flex items-center justify-between py-3 border-b border-surface-200 dark:border-surface-700">
                                <span class="text-muted-color">{{ $t('manage.today') }}</span>
                                <span class="font-mono font-semibold text-primary">{{ admin.playtime?.today || '00:00' }}</span>
                            </li>
                            <li class="flex items-center justify-between py-3 border-b border-surface-200 dark:border-surface-700">
                                <span class="text-muted-color">{{ $t('manage.yesterday') }}</span>
                                <span class="font-mono font-semibold">{{ admin.playtime?.yesterday || '00:00' }}</span>
                            </li>
                            <li class="flex items-center justify-between py-3 border-b border-surface-200 dark:border-surface-700">
                                <span class="text-muted-color">{{ $t('manage.day_before') }}</span>
                                <span class="font-mono font-semibold">{{ admin.playtime?.day_before || '00:00' }}</span>
                            </li>
                            <li class="flex items-center justify-between py-3">
                                <span class="text-muted-color">{{ $t('manage.this_week') }}</span>
                                <span class="font-mono font-semibold text-green-500">{{ admin.playtime?.week || '00:00' }}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 xl:col-span-8">
                    <div class="card h-full">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div class="font-semibold text-xl">{{ $t('manage.actions') }}</div>
                            <div class="flex flex-wrap items-center gap-4">
                                <label v-if="canShowLogAccessToggle" class="flex items-center gap-2 cursor-pointer select-none">
                                    <Checkbox v-model="admin.has_log_access" :binary="true" :disabled="updatingLogAccess" @update:modelValue="updateLogAccess" />
                                    <span class="text-sm text-muted-color">{{ $t('manage.grant_log_access') }}</span>
                                </label>
                                <label v-if="canShowLogAccessToggle" class="flex items-center gap-2 cursor-pointer select-none">
                                    <Checkbox v-model="admin.has_reputation_access" :binary="true" :disabled="updatingReputationAccess" @update:modelValue="updateReputationAccess" />
                                    <span class="text-sm text-muted-color">{{ $t('manage.grant_reputation_access') }}</span>
                                </label>
                            </div>
                        </div>

                        <div v-if="actions.length" class="flex flex-col gap-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="flex flex-col gap-2">
                                    <label for="action">{{ $t('manage.select_action') }}</label>
                                    <Select id="action" v-model="selectedAction" :options="actions" :placeholder="$t('manage.select_action')" class="w-full">
                                        <template #value="{ value }">
                                            {{ value ? getActionLabel(value) : $t('manage.select_action') }}
                                        </template>
                                        <template #option="{ option }">
                                            {{ getActionLabel(option) }}
                                        </template>
                                    </Select>
                                </div>

                                <div v-if="selectedAction && actionsNeedingReason.includes(selectedAction)" class="flex flex-col gap-2">
                                    <label for="reason">{{ $t('common.reason') }}</label>
                                    <InputText id="reason" v-model="reason" :placeholder="$t('manage.reason_placeholder')" class="w-full" />
                                </div>
                            </div>

                            <Button :label="$t('manage.execute')" icon="pi pi-check" :loading="executing" :disabled="!selectedAction" class="w-auto self-start" @click="executeAction" />
                        </div>

                        <div v-else class="text-center py-8">
                            <i class="pi pi-lock text-4xl text-muted-color mb-4"></i>
                            <p class="text-muted-color">{{ $t('manage.no_actions') }}</p>
                        </div>
                    </div>
                </div>

                <div class="col-span-12 xl:col-span-4">
                    <div class="card h-full flex flex-col">
                        <div class="font-semibold text-xl mb-4">{{ $t('charts.online_history') }}</div>

                        <div v-if="chartData" class="flex flex-col gap-4 flex-1">
                            <div class="flex gap-3">
                                <div class="flex-1 text-center p-3 rounded-lg" :class="weeklyMet ? 'bg-green-500/10' : 'bg-orange-500/10'">
                                    <div class="text-lg font-bold" :class="weeklyMet ? 'text-green-500' : 'text-orange-500'">
                                        {{ weeklyTotal }}{{ $t('charts.hours_short') }}
                                    </div>
                                    <div class="text-xs text-muted-color">{{ $t('charts.this_week') }}</div>
                                </div>
                                <div class="flex-1 text-center p-3 bg-surface-100 dark:bg-surface-800 rounded-lg">
                                    <div class="text-lg font-bold text-primary">{{ weeklyNorm }}{{ $t('charts.hours_short') }}</div>
                                    <div class="text-xs text-muted-color">{{ $t('charts.weekly_norm') }}</div>
                                </div>
                            </div>
                            <div class="flex-1 min-h-[180px]">
                                <Chart type="line" :data="chartData" :options="chartOptions" class="h-full" />
                            </div>
                        </div>

                        <div v-else class="flex flex-col items-center justify-center py-8 text-muted-color flex-1">
                            <i class="pi pi-chart-line text-4xl mb-2"></i>
                            <span>{{ $t('charts.no_data') }}</span>
                        </div>
                    </div>
                </div>
            </div>


            <AdminWorkStats v-if="Number(admin.level) >= 6" :stats="workStats" />

            <div v-if="authStore.canViewAdminActions" class="card">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div>
                        <div class="font-semibold text-xl">{{ recentLabels.title }}</div>
                        <div class="text-sm text-muted-color mt-1">{{ recentLabels.subtitle }}</div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <Button :label="interactionLabels.button" icon="pi pi-history" severity="secondary" outlined @click="openInteractionHistory" />
                        <Button :label="recentLabels.openAll" icon="pi pi-external-link" severity="secondary" outlined @click="openAdminLogs" />
                    </div>
                </div>

                <DataTable :value="recentActions" :loading="recentActionsLoading" stripedRows class="p-datatable-sm">
                    <Column field="date" :header="recentLabels.date" style="width: 180px" />
                    <Column field="player" :header="recentLabels.player" style="width: 180px" />
                    <Column field="cmd" :header="recentLabels.command" style="width: 130px" />
                    <Column field="amount" :header="recentLabels.amount" style="width: 90px" />
                    <Column field="reason" :header="recentLabels.command" />
                    <Column style="width: 60px">
                        <template #body="{ data }">
                            <Button icon="pi pi-copy" text rounded size="small" @click="copyRecentAction(data)" v-tooltip.top="$t('common.copy')" />
                        </template>
                    </Column>

                    <template #empty>
                        <div class="text-center py-8 text-muted-color">{{ recentLabels.empty }}</div>
                    </template>
                </DataTable>

                <div v-if="recentActionsTotal > recentActions.length" class="text-sm text-muted-color mt-3">
                    {{ recentLabels.total }}: {{ recentActionsTotal }}. {{ recentLabels.hint }}
                </div>
            </div>

            <div v-if="admin.stats" class="card">
                <div class="font-semibold text-xl mb-4">{{ $t('manage.admin_stats') }}</div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="flex items-center justify-between p-4 bg-surface-100 dark:bg-surface-800 rounded-lg">
                        <div>
                            <div class="text-muted-color text-sm">{{ $t('manage.hours_played') }}</div>
                            <div class="text-2xl font-bold">{{ admin.stats.hours_played }}</div>
                        </div>
                        <div class="text-muted-color">/ {{ admin.stats.hours_required }}</div>
                    </div>
                    <div class="flex items-center justify-between p-4 bg-surface-100 dark:bg-surface-800 rounded-lg">
                        <div>
                            <div class="text-muted-color text-sm">{{ $t('manage.punishments') }}</div>
                            <div class="text-2xl font-bold">{{ admin.stats.punishments }}</div>
                        </div>
                        <div class="text-muted-color">/ {{ admin.stats.punishments_required }}</div>
                    </div>
                    <div class="flex items-center justify-between p-4 bg-surface-100 dark:bg-surface-800 rounded-lg">
                        <div>
                            <div class="text-muted-color text-sm">{{ $t('manage.reports') }}</div>
                            <div class="text-2xl font-bold">{{ admin.stats.reports }}</div>
                        </div>
                        <div class="text-muted-color">/ {{ admin.stats.reports_required }}</div>
                    </div>
                </div>
            </div>
        </template>

        <div v-else class="card text-center py-8">
            <i class="pi pi-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
            <p class="text-muted-color">{{ $t('manage.admin_not_found') }}</p>
        </div>
        <Dialog v-model:visible="interactionDialogVisible" modal :header="interactionLabels.title" :style="{ width: '72rem' }" :breakpoints="{ '1199px': '90vw', '575px': '96vw' }">
            <div class="text-sm text-muted-color mb-4">{{ interactionLabels.subtitle }}</div>
            <DataTable :value="interactionHistory" :loading="interactionHistoryLoading" stripedRows class="p-datatable-sm">
                <Column field="date" :header="interactionLabels.date" style="width: 170px" />
                <Column :header="interactionLabels.action" style="width: 150px">
                    <template #body="{ data }">
                        <Tag :value="interactionActionLabel(data)" severity="secondary" />
                    </template>
                </Column>
                <Column field="actor" :header="interactionLabels.actor" style="width: 170px" />
                <Column field="target" :header="interactionLabels.target" style="width: 170px" />
                <Column field="summary" :header="interactionLabels.details" style="width: 170px" />
                <Column field="reason" :header="interactionLabels.reason" />
                <Column style="width: 56px">
                    <template #body="{ data }">
                        <Button icon="pi pi-copy" text rounded size="small" @click="copyInteraction(data)" v-tooltip.top="interactionLabels.copy" />
                    </template>
                </Column>
                <template #empty>
                    <div class="text-center py-8 text-muted-color">{{ interactionLabels.empty }}</div>
                </template>
            </DataTable>
        </Dialog>

    </div>
</template>

<style scoped>
.role-color-input {
    width: 4.25rem;
    height: 2.75rem;
    padding: 0.2rem;
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    background: var(--surface-ground);
    cursor: pointer;
}

.role-color-input:disabled {
    cursor: not-allowed;
    opacity: 0.65;
}
</style>
