<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'primevue/usetoast';
import api from '@/service/api';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const loading = ref(true);
const adminList = ref(null);
const expandedLevels = ref({});

const filters = ref({
    name: '',
    level: 'all',
    type: 'all',
    status: 'all',
    todayMin: null,
    threeDaysMin: null,
    weekMin: null
});
const groupByLevel = ref(true);

const addDialog = ref(false);
const addLoading = ref(false);
const newAdmin = ref({
    nickname: '',
    level: 1,
    reason: ''
});

const canAddAdmin = computed(() => {
    if (!authStore.admin) return false;
    const level = authStore.admin.level || 0;
    return level >= 7;
});

const maxAssignableLevel = computed(() => {
    if (!authStore.admin) return 5;
    return authStore.admin.level === 8 ? 7 : (authStore.admin.level === 7 ? 6 : 5);
});

const levelOptions = computed(() => {
    const max = maxAssignableLevel.value;
    return Array.from({ length: max }, (_, i) => ({
        label: `${t('common.level')} ${i + 1}`,
        value: i + 1
    }));
});

const filterLevelOptions = computed(() => {
    const levels = adminList.value?.admins?.length
        ? [...new Set(adminList.value.admins.map((admin) => admin.level))].sort((a, b) => b - a)
        : [7, 6, 5, 4, 3, 2, 1];

    return [
        { label: t('admins.filters.all_levels'), value: 'all' },
        ...levels.map((level) => ({ label: t('common.level') + ' ' + level, value: level }))
    ];
});

const typeOptions = computed(() => [
    { label: t('admins.filters.all_types'), value: 'all' },
    { label: t('admins.media'), value: 'yt' },
    { label: t('admins.support'), value: 'sup' }
]);

const statusOptions = computed(() => [
    { label: t('admins.filters.all_statuses'), value: 'all' },
    { label: t('common.online'), value: 'online' },
    { label: t('common.offline'), value: 'offline' }
]);

onMounted(async () => {
    await loadAdmins();
});

async function loadAdmins() {
    loading.value = true;
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        const { data } = await api.get(`/admin/list${serverParam}`);
        adminList.value = data;
        const levels = [...new Set(data.admins.map((a) => a.level))].sort((a, b) => b - a);
        levels.forEach((level) => {
            expandedLevels.value[level] = true;
        });
    } catch (error) {
        // it happens
    } finally {
        loading.value = false;
    }
}

const availableLevels = computed(() => {
    if (!adminList.value?.admins) return [];
    if (filters.value.level !== 'all') return [filters.value.level];
    return [...new Set(adminList.value.admins.map((a) => a.level))].sort((a, b) => b - a);
});

function filterAdmin(admin) {
    if (filters.value.name && !admin.name.toLowerCase().includes(filters.value.name.toLowerCase())) return false;
    if (filters.value.level !== 'all' && admin.level !== filters.value.level) return false;
    if (filters.value.type === 'yt' && !admin.is_youtuber) return false;
    if (filters.value.type === 'sup' && !admin.is_support) return false;
    if (filters.value.status === 'online' && !admin.is_online) return false;
    if (filters.value.status === 'offline' && admin.is_online) return false;
    if (!passesPlaytimeFilter(admin.playtime_today, filters.value.todayMin)) return false;
    if (!passesPlaytimeFilter(admin.playtime_3days, filters.value.threeDaysMin)) return false;
    if (!passesPlaytimeFilter(admin.playtime_week, filters.value.weekMin)) return false;
    return true;
}

function parsePlaytimeHours(value) {
    if (!value) return 0;
    const [hours = '0', minutes = '0'] = String(value).split(':');
    return Number(hours || 0) + Number(minutes || 0) / 60;
}

function passesPlaytimeFilter(playtime, minimum) {
    const min = Number(minimum);
    if (!Number.isFinite(min) || min <= 0) return true;
    return parsePlaytimeHours(playtime) >= min;
}

function clearPlaytimeFilters() {
    filters.value.todayMin = null;
    filters.value.threeDaysMin = null;
    filters.value.weekMin = null;
}

function getAdminsByLevel(level) {
    if (!adminList.value?.admins) return [];
    return adminList.value.admins.filter((a) => a.level === level && filterAdmin(a));
}

const flatAdminList = computed(() => {
    if (!adminList.value?.admins) return [];
    return adminList.value.admins
        .filter(filterAdmin)
        .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
});

const canViewDetails = computed(() => adminList.value?.can_view_details ?? false);

function openAdmin(admin) {
    if (!canViewDetails.value) return;
    router.push({ name: 'admin-manage', params: { name: admin.name } });
}

function toggleLevel(level) {
    expandedLevels.value[level] = !expandedLevels.value[level];
}

function openAddDialog() {
    newAdmin.value = { nickname: '', level: 1, reason: '' };
    addDialog.value = true;
}

async function submitNewAdmin() {
    if (!newAdmin.value.nickname.trim()) {
        toast.add({ severity: 'warn', summary: t('common.warning'), detail: t('admins.add_dialog.nickname_required'), life: 3000 });
        return;
    }
    if (!newAdmin.value.reason.trim()) {
        toast.add({ severity: 'warn', summary: t('common.warning'), detail: t('admins.add_dialog.reason_required'), life: 3000 });
        return;
    }

    addLoading.value = true;
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        await api.post(`/admin/manage/add${serverParam}`, {
            nickname: newAdmin.value.nickname,
            level: newAdmin.value.level,
            reason: newAdmin.value.reason
        });

        toast.add({ severity: 'success', summary: t('common.success'), detail: t('admins.add_dialog.success'), life: 3000 });
        addDialog.value = false;
        await loadAdmins();
    } catch (error) {
        const msg = error.response?.data?.error || t('admins.add_dialog.failed');
        toast.add({ severity: 'error', summary: t('common.error'), detail: msg, life: 5000 });
    } finally {
        addLoading.value = false;
    }
}
</script>

<template>
    <Fluid>
        <div class="card flex flex-col gap-4">
            <div class="flex justify-between items-center">
                <div class="font-semibold text-xl">{{ $t('admins.title') }}</div>
                <div class="flex items-center gap-2" v-if="adminList">
                    <Tag severity="info">{{ $t('common.total') }}: {{ adminList.total }}</Tag>
                    <Tag severity="success">{{ $t('common.online') }}: {{ adminList.online }}</Tag>
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                <div class="flex flex-col gap-2">
                    <label>{{ $t('admins.search_label') }}</label>
                    <InputText v-model="filters.name" :placeholder="$t('admins.search_placeholder')" />
                </div>
                <div class="flex flex-col gap-2">
                    <label>{{ $t('common.level') }}</label>
                    <Select v-model="filters.level" :options="filterLevelOptions" optionLabel="label" optionValue="value" />
                </div>
                <div class="flex flex-col gap-2">
                    <label>{{ $t('common.type') }}</label>
                    <Select v-model="filters.type" :options="typeOptions" optionLabel="label" optionValue="value" />
                </div>
                <div class="flex flex-col gap-2">
                    <label>{{ $t('common.status') }}</label>
                    <Select v-model="filters.status" :options="statusOptions" optionLabel="label" optionValue="value" />
                </div>
                <div class="flex flex-col gap-2">
                    <label>{{ $t('admins.filters.view') }}</label>
                    <div class="flex items-center gap-2 h-[42px]">
                        <InputSwitch v-model="groupByLevel" />
                        <span class="text-sm text-muted-color">{{ $t('admins.filters.group_by_level') }}</span>
                    </div>
                </div>
                <div class="flex gap-2 items-end">
                    <Button v-if="canAddAdmin" :label="$t('admins.add_admin')" icon="pi pi-plus" @click="openAddDialog" />
                </div>
            </div>

            <div class="border-t border-surface-200 dark:border-surface-700 pt-4">
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <div class="flex flex-col gap-2">
                        <label class="text-sm font-medium">Фильтр по онлайну</label>
                        <InputNumber v-model="filters.todayMin" inputClass="w-full" :min="0" :maxFractionDigits="1" :useGrouping="false" placeholder="Сегодня от, ч" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-sm text-muted-color">&nbsp;</label>
                        <InputNumber v-model="filters.threeDaysMin" inputClass="w-full" :min="0" :maxFractionDigits="1" :useGrouping="false" placeholder="За 3 дня от, ч" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-sm text-muted-color">&nbsp;</label>
                        <InputNumber v-model="filters.weekMin" inputClass="w-full" :min="0" :maxFractionDigits="1" :useGrouping="false" placeholder="За неделю от, ч" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-sm text-muted-color">&nbsp;</label>
                        <Button label="Сбросить онлайн" icon="pi pi-filter-slash" severity="secondary" outlined @click="clearPlaytimeFilters" />
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <ProgressSpinner v-if="loading" class="flex justify-center py-8" />

            <template v-else-if="adminList">
                <div v-if="groupByLevel" class="flex flex-col gap-4">
                    <div v-for="level in availableLevels" :key="level">
                        <div class="flex items-center gap-2 cursor-pointer p-3 bg-surface-100 dark:bg-surface-800 rounded-lg mb-2" @click="toggleLevel(level)">
                            <i :class="['pi', expandedLevels[level] ? 'pi-chevron-down' : 'pi-chevron-right']"></i>
                            <span class="font-semibold">{{ $t('common.level') }} {{ level }}</span>
                            <Tag size="small">{{ getAdminsByLevel(level).length }}</Tag>
                        </div>

                        <DataTable v-if="expandedLevels[level]" :value="getAdminsByLevel(level)" stripedRows size="small" responsiveLayout="scroll">
                            <Column field="name" :header="$t('common.name')" style="width: 280px">
                                <template #body="{ data }">
                                    <span class="admin-name-cell">
                                        <button v-if="canViewDetails" type="button" class="admin-name-link" @click="openAdmin(data)">{{ data.name }}</button>
                                        <span v-else class="admin-name-text">{{ data.name }}</span>
                                        <Tag v-if="data.is_support" severity="info" size="small">{{ $t('admins.support') }}</Tag>
                                        <Tag v-if="data.is_youtuber" severity="danger" size="small">{{ $t('admins.media') }}</Tag>
                                    </span>
                                </template>
                            </Column>
                            <Column field="warnings" :header="$t('admins.warns')">
                                <template #body="{ data }">
                                    <span :class="{ 'text-red-500 font-bold': data.warnings >= 2 }">{{ data.warnings }}/3</span>
                                </template>
                            </Column>
                            <Column :header="$t('admins.rep')">
                                <template #body="{ data }">
                                    <span class="text-green-500">+{{ data.reputation?.up || 0 }}</span>
                                    <span class="text-muted-color"> / </span>
                                    <span class="text-red-500">-{{ data.reputation?.down || 0 }}</span>
                                </template>
                            </Column>
                            <Column field="playtime_today" header="Сегодня" />
                            <Column field="playtime_3days" :header="$t('admins.three_days')" />
                            <Column field="playtime_week" :header="$t('admins.week')" />
                            <Column :header="$t('common.status')">
                                <template #body="{ data }">
                                    <Tag :severity="data.is_online ? 'success' : 'secondary'" size="small">
                                        {{ data.is_online ? $t('common.online') : $t('common.offline') }}
                                    </Tag>
                                </template>
                            </Column>
                            <Column field="appointed_at" :header="$t('admins.appointed_at')">
                                <template #body="{ data }">
                                    {{ data.appointed_at || $t('common.unknown') }}
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </div>

                <DataTable v-else :value="flatAdminList" stripedRows size="small" responsiveLayout="scroll">
                    <Column field="name" :header="$t('common.name')" style="width: 280px">
                        <template #body="{ data }">
                            <span class="admin-name-cell">
                                <button v-if="canViewDetails" type="button" class="admin-name-link" @click="openAdmin(data)">{{ data.name }}</button>
                                <span v-else class="admin-name-text">{{ data.name }}</span>
                                <Tag v-if="data.is_support" severity="info" size="small">Support</Tag>
                                <Tag v-if="data.is_youtuber" severity="danger" size="small">Media</Tag>
                            </span>
                        </template>
                    </Column>
                    <Column field="level" :header="$t('common.level')" style="width: 80px" />
                    <Column field="warnings" :header="$t('admins.warns')">
                        <template #body="{ data }">
                            <span :class="{ 'text-red-500 font-bold': data.warnings >= 2 }">{{ data.warnings }}/3</span>
                        </template>
                    </Column>
                    <Column :header="$t('admins.rep')">
                        <template #body="{ data }">
                            <span class="text-green-500">+{{ data.reputation?.up || 0 }}</span>
                            <span class="text-muted-color"> / </span>
                            <span class="text-red-500">-{{ data.reputation?.down || 0 }}</span>
                        </template>
                    </Column>
                    <Column field="playtime_today" header="Сегодня" />
                    <Column field="playtime_3days" :header="$t('admins.three_days')" />
                    <Column field="playtime_week" :header="$t('admins.week')" />
                    <Column :header="$t('common.status')">
                        <template #body="{ data }">
                            <Tag :severity="data.is_online ? 'success' : 'secondary'" size="small">
                                {{ data.is_online ? $t('common.online') : $t('common.offline') }}
                            </Tag>
                        </template>
                    </Column>
                    <Column field="appointed_at" :header="$t('admins.appointed_at')">
                        <template #body="{ data }">
                            {{ data.appointed_at || $t('common.unknown') }}
                        </template>
                    </Column>

                    <template #empty>
                        <div class="text-center py-8 text-muted-color">{{ $t('admins.no_results') }}</div>
                    </template>
                </DataTable>
            </template>

            <div v-else class="text-center py-8">
                <i class="pi pi-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
                <p class="text-muted-color">{{ $t('admins.failed_load') }}</p>
            </div>
        </div>

        <Dialog v-model:visible="addDialog" :header="$t('admins.add_dialog.title')" modal class="w-full max-w-md">
            <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-2">
                    <label for="nickname">{{ $t('admins.add_dialog.nickname') }}</label>
                    <InputText id="nickname" v-model="newAdmin.nickname" :placeholder="$t('admins.add_dialog.nickname_placeholder')" />
                </div>
                <div class="flex flex-col gap-2">
                    <label for="level">{{ $t('admins.add_dialog.level') }}</label>
                    <Select id="level" v-model="newAdmin.level" :options="levelOptions" optionLabel="label" optionValue="value" :placeholder="$t('admins.add_dialog.select_level')" />
                </div>
                <div class="flex flex-col gap-2">
                    <label for="reason">{{ $t('admins.add_dialog.reason') }}</label>
                    <Textarea id="reason" v-model="newAdmin.reason" rows="3" :placeholder="$t('admins.add_dialog.reason_placeholder')" />
                </div>
            </div>
            <template #footer>
                <Button :label="$t('common.cancel')" text @click="addDialog = false" />
                <Button :label="$t('admins.add_admin')" :loading="addLoading" @click="submitNewAdmin" />
            </template>
        </Dialog>
    </Fluid>
</template>

<style scoped>
.admin-name-cell {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    max-width: 100%;
    white-space: nowrap;
}

.admin-name-link {
    display: inline;
    min-width: 0;
    max-width: 12rem;
    overflow: hidden;
    text-overflow: ellipsis;
    border: 0;
    padding: 0;
    background: transparent;
    color: var(--p-primary-color);
    font: inherit;
    font-weight: 600;
    line-height: 1.2;
    text-align: left;
    cursor: pointer;
}

.admin-name-link:hover {
    text-decoration: underline;
}

.admin-name-text {
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 600;
}
</style>
