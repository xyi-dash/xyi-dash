<script setup>
import api from '@/service/api';
import { useAuthStore } from '@/stores/auth';
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();
const toast = useToast();

const loading = ref(true);
const player = ref(null);
const editMode = ref(false);
const saving = ref(false);
const editData = ref({});

const getRankLabel = (rank) => t(`extended.player_stats.ranks.${rank}`);

const clanRankLabel = computed(() => {
    const rank = player.value?.clan?.rank;
    if (rank === undefined || rank === null) return '-';
    return t(`extended.player_stats.clan_ranks.${rank}`, t('common.unknown'));
});

onMounted(() => loadPlayer());

async function loadPlayer() {
    loading.value = true;
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        const response = await api.get(`/admin/players/${route.params.id}${serverParam}`);
        player.value = response.data.data;
    } catch {
        console.warn('player evaporated');
    } finally {
        loading.value = false;
    }
}

const goBack = () => router.push({ name: 'extended-players' });

function startEdit() {
    editData.value = {
        name: player.value.name,
        level: player.value.level,
        cash: player.value.cash,
        donate: player.value.donate?.money || 0,
        kills: player.value.kills,
        deaths: player.value.deaths,
        google_type: player.value.security?.google_type || 0,
        google_key: player.value.security?.google_key || ''
    };
    if (player.value.gangwar) {
        editData.value.gangwar = {
            grove: player.value.gangwar.grove || 0,
            ballas: player.value.gangwar.ballas || 0,
            vagos: player.value.gangwar.vagos || 0,
            aztec: player.value.gangwar.aztec || 0
        };
    }
    if (player.value.matchmaking) {
        editData.value.matchmaking = {
            elo: player.value.matchmaking.elo || 0,
            games: player.value.matchmaking.games || 0,
            wins: player.value.matchmaking.wins || 0,
            kills: player.value.matchmaking.kills || 0,
            deaths: player.value.matchmaking.deaths || 0,
            mvp: player.value.matchmaking.mvp || 0
        };
    }
    editMode.value = true;
}

function cancelEdit() {
    editMode.value = false;
    editData.value = {};
}

async function saveEdit() {
    // Валидация
    if (editData.value.level < 1) {
        toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Уровень должен быть больше 0', life: 3000 });
        return;
    }
    if (editData.value.cash < 0 || editData.value.donate < 0) {
        toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Деньги и донат не могут быть отрицательными', life: 3000 });
        return;
    }
    if (editData.value.kills < 0 || editData.value.deaths < 0) {
        toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Убийства и смерти не могут быть отрицательными', life: 3000 });
        return;
    }

    saving.value = true;
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        await api.put(`/admin/players/${route.params.id}${serverParam}`, editData.value);
        toast.add({ severity: 'success', summary: 'Успешно', detail: 'Статистика игрока обновлена', life: 3000 });
        await loadPlayer();
        editMode.value = false;
        editData.value = {};
    } catch (error) {
        console.error('save failed', error);
        toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось сохранить изменения', life: 3000 });
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div class="flex flex-col gap-8">
        <div class="card">
            <div class="flex items-center gap-2 mb-4">
                <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
                <div class="font-semibold text-xl">{{ $t('extended.player_stats.title') }}</div>
            </div>

            <ProgressSpinner v-if="loading" class="flex justify-center py-8" />

            <template v-else-if="player">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div v-if="editMode" class="mb-2">
                            <InputText v-model="editData.name" class="text-2xl font-medium w-full" />
                        </div>
                        <div v-else class="text-surface-900 dark:text-surface-0 font-medium text-2xl mb-2">{{ player.name }}</div>
                        <div class="flex flex-wrap gap-4 text-sm text-muted-color">
                            <span>ID: <span class="font-mono text-surface-900 dark:text-surface-0">{{ player.id }}</span></span>
                            <span>{{ $t('extended.player_stats.registered') }}: <span class="text-surface-900 dark:text-surface-0">{{ player.registered_at }}</span></span>
                            <span>{{ $t('extended.player_stats.last_online') }}: <span class="text-surface-900 dark:text-surface-0">{{ player.last_online }}</span></span>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <Tag severity="info">{{ getRankLabel(player.rank) }}</Tag>
                        <Tag v-if="player.vip" severity="warn">VIP</Tag>
                        <Tag v-if="player.premium" severity="success">PREMIUM</Tag>
                    </div>
                </div>
                
                <div v-if="!editMode && authStore.admin?.level >= 8" class="flex justify-end mt-4">
                    <Button label="Редактировать" icon="pi pi-pencil" @click="startEdit" />
                </div>
                <div v-if="editMode" class="flex justify-end gap-2 mt-4">
                    <Button label="Отмена" icon="pi pi-times" severity="secondary" @click="cancelEdit" :disabled="saving" />
                    <Button label="Сохранить" icon="pi pi-check" @click="saveEdit" :loading="saving" />
                </div>
            </template>

            <div v-else class="text-center py-8">
                <i class="pi pi-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
                <p class="text-muted-color">{{ $t('extended.player_stats.player_not_found') }}</p>
            </div>
        </div>

        <template v-if="player && !loading">
            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <div class="flex justify-between mb-4">
                            <div class="w-full">
                                <span class="block text-muted-color font-medium mb-4">{{ $t('extended.player_stats.level') }}</span>
                                <InputNumber v-if="editMode" v-model="editData.level" :min="1" :max="999" class="w-full" />
                                <div v-else class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ player.level }}</div>
                            </div>
                            <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                                <i class="pi pi-star text-blue-500 text-xl!"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <div class="flex justify-between mb-4">
                            <div class="w-full">
                                <span class="block text-muted-color font-medium mb-4">{{ $t('extended.player_stats.cash') }}</span>
                                <InputNumber v-if="editMode" v-model="editData.cash" :min="0" mode="currency" currency="USD" locale="en-US" class="w-full" />
                                <div v-else class="text-green-500 font-medium text-xl">${{ player.cash?.toLocaleString() }}</div>
                            </div>
                            <div class="flex items-center justify-center bg-green-100 dark:bg-green-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                                <i class="pi pi-dollar text-green-500 text-xl!"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <div class="flex justify-between mb-4">
                            <div class="w-full">
                                <span class="block text-muted-color font-medium mb-4">{{ $t('extended.player_stats.donate') }}</span>
                                <InputNumber v-if="editMode" v-model="editData.donate" :min="0" suffix=" ₽" class="w-full" />
                                <div v-else class="text-yellow-500 font-medium text-xl">{{ player.donate?.money || 0 }} ₽</div>
                            </div>
                            <div class="flex items-center justify-center bg-yellow-100 dark:bg-yellow-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                                <i class="pi pi-credit-card text-yellow-500 text-xl!"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <div class="flex justify-between mb-4">
                            <div>
                                <span class="block text-muted-color font-medium mb-4">{{ $t('extended.player_stats.kd') }}</span>
                                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ player.kd }}</div>
                            </div>
                            <div class="flex items-center justify-center bg-red-100 dark:bg-red-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                                <i class="pi pi-chart-line text-red-500 text-xl!"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 xl:col-span-6">
                    <div class="card">
                        <div class="font-semibold text-xl mb-4">{{ $t('extended.player_stats.statistics') }}</div>
                        <ul class="list-none p-0 m-0">
                            <li class="flex items-center py-4 border-b border-surface-200 dark:border-surface-700">
                                <div class="text-muted-color w-1/2">{{ $t('extended.player_stats.kills') }}</div>
                                <div class="w-1/2">
                                    <InputNumber v-if="editMode" v-model="editData.kills" :min="0" class="w-full" />
                                    <div v-else class="text-surface-900 dark:text-surface-0 font-medium">{{ player.kills?.toLocaleString() }}</div>
                                </div>
                            </li>
                            <li class="flex items-center py-4 border-b border-surface-200 dark:border-surface-700">
                                <div class="text-muted-color w-1/2">{{ $t('extended.player_stats.deaths') }}</div>
                                <div class="w-1/2">
                                    <InputNumber v-if="editMode" v-model="editData.deaths" :min="0" class="w-full" />
                                    <div v-else class="text-surface-900 dark:text-surface-0 font-medium">{{ player.deaths?.toLocaleString() }}</div>
                                </div>
                            </li>
                            <li class="flex items-center py-4 border-b border-surface-200 dark:border-surface-700">
                                <div class="text-muted-color w-1/2">{{ $t('extended.player_stats.reputation') }}</div>
                                <div class="font-medium w-1/2" :class="{ 'text-green-500': player.reputation > 0, 'text-red-500': player.reputation < 0 }">{{ player.reputation || 0 }}</div>
                            </li>
                            <li class="flex items-center py-4">
                                <div class="text-muted-color w-1/2">{{ $t('extended.player_stats.playtime') }}</div>
                                <div class="text-surface-900 dark:text-surface-0 font-medium w-1/2">{{ player.playtime || '0ч' }}</div>
                            </li>
                        </ul>
                    </div>

                    <div v-if="player.gangwar" class="card">
                        <div class="font-semibold text-xl mb-4">{{ $t('extended.player_stats.gangwar_stats') }}</div>
                        <ul class="list-none p-0 m-0">
                            <li class="flex items-center py-4 border-b border-surface-200 dark:border-surface-700">
                                <div class="text-muted-color w-1/2">Grove Street</div>
                                <div class="w-1/2">
                                    <InputNumber v-if="editMode" v-model="editData.gangwar.grove" :min="0" class="w-full" />
                                    <div v-else class="text-green-500 font-medium">{{ player.gangwar.grove?.toLocaleString() }}</div>
                                </div>
                            </li>
                            <li class="flex items-center py-4 border-b border-surface-200 dark:border-surface-700">
                                <div class="text-muted-color w-1/2">Ballas</div>
                                <div class="w-1/2">
                                    <InputNumber v-if="editMode" v-model="editData.gangwar.ballas" :min="0" class="w-full" />
                                    <div v-else class="text-purple-500 font-medium">{{ player.gangwar.ballas?.toLocaleString() }}</div>
                                </div>
                            </li>
                            <li class="flex items-center py-4 border-b border-surface-200 dark:border-surface-700">
                                <div class="text-muted-color w-1/2">Vagos</div>
                                <div class="w-1/2">
                                    <InputNumber v-if="editMode" v-model="editData.gangwar.vagos" :min="0" class="w-full" />
                                    <div v-else class="text-yellow-500 font-medium">{{ player.gangwar.vagos?.toLocaleString() }}</div>
                                </div>
                            </li>
                            <li class="flex items-center py-4">
                                <div class="text-muted-color w-1/2">Aztecas</div>
                                <div class="w-1/2">
                                    <InputNumber v-if="editMode" v-model="editData.gangwar.aztec" :min="0" class="w-full" />
                                    <div v-else class="text-cyan-500 font-medium">{{ player.gangwar.aztec?.toLocaleString() }}</div>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="col-span-12 xl:col-span-6">
                    <div class="card">
                        <div class="font-semibold text-xl mb-4">{{ $t('extended.player_stats.basic_info') }}</div>
                        <ul class="list-none p-0 m-0">
                            <li class="flex items-center py-4 border-b border-surface-200 dark:border-surface-700">
                                <div class="text-muted-color w-1/2">{{ $t('extended.player_stats.email') }}</div>
                                <div class="text-surface-900 dark:text-surface-0 font-medium w-1/2 flex items-center gap-2">
                                    {{ player.email || '-' }}
                                    <i v-if="player.email_verified" class="pi pi-check-circle text-green-500"></i>
                                </div>
                            </li>
                            <li class="flex items-center py-4 border-b border-surface-200 dark:border-surface-700">
                                <div class="text-muted-color w-1/2">{{ $t('extended.player_stats.last_ip') }}</div>
                                <div class="text-surface-900 dark:text-surface-0 font-mono w-1/2">{{ player.ip_last || '-' }}</div>
                            </li>
                            <li class="flex items-center py-4 border-b border-surface-200 dark:border-surface-700">
                                <div class="text-muted-color w-1/2">{{ $t('extended.player_stats.reg_ip') }}</div>
                                <div class="text-surface-900 dark:text-surface-0 font-mono w-1/2">{{ player.ip_reg || '-' }}</div>
                            </li>
                            <li class="flex items-center py-4 border-b border-surface-200 dark:border-surface-700">
                                <div class="text-muted-color w-1/2">{{ $t('extended.player_stats.td_pass') }}</div>
                                <div class="w-1/2">
                                    <Tag :severity="player.security?.td_pass_set ? 'success' : 'danger'" size="small">
                                        {{ player.security?.td_pass_set ? $t('common.set') : $t('common.not_set') }}
                                    </Tag>
                                </div>
                            </li>
                            <li class="flex items-center py-4 border-b border-surface-200 dark:border-surface-700">
                                <div class="text-muted-color w-1/2">{{ $t('extended.player_stats.vid_kod') }}</div>
                                <div class="text-surface-900 dark:text-surface-0 font-medium w-1/2">{{ player.security?.vid_kod === 0 ? $t('extended.player_stats.vid_kod_every') : $t('extended.player_stats.vid_kod_ip') }}</div>
                            </li>
                            <li class="flex items-center py-4 border-b border-surface-200 dark:border-surface-700">
                                <div class="text-muted-color w-1/2">Google Authenticator</div>
                                <div class="w-1/2">
                                    <Dropdown v-if="editMode" v-model="editData.google_type" :options="[{label: 'Да', value: 1}, {label: 'Нет', value: 0}]" optionLabel="label" optionValue="value" class="w-full" />
                                    <Tag v-else :severity="player.security?.google_type === 1 ? 'success' : 'danger'" size="small">
                                        {{ player.security?.google_type === 1 ? 'Да' : 'Нет' }}
                                    </Tag>
                                </div>
                            </li>
                            <li class="flex items-center py-4">
                                <div class="text-muted-color w-1/2">Google Key</div>
                                <div class="w-1/2">
                                    <div v-if="editMode" class="flex gap-2">
                                        <InputText v-model="editData.google_key" class="flex-1" placeholder="Google Key" />
                                        <Button icon="pi pi-trash" severity="danger" size="small" @click="editData.google_key = ''" />
                                    </div>
                                    <div v-else class="text-surface-900 dark:text-surface-0 font-mono">{{ player.security?.google_key && player.security.google_key !== '-' ? player.security.google_key : '-' }}</div>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div v-if="player.clan?.id" class="card">
                        <div class="font-semibold text-xl mb-4">{{ $t('extended.player_stats.clan_info') }}</div>
                        <ul class="list-none p-0 m-0">
                            <li class="flex items-center py-4 border-b border-surface-200 dark:border-surface-700">
                                <div class="text-muted-color w-1/2">{{ $t('extended.player_stats.clan_name') }}</div>
                                <div class="text-surface-900 dark:text-surface-0 font-semibold w-1/2">{{ player.clan.name }}</div>
                            </li>
                            <li class="flex items-center py-4 border-b border-surface-200 dark:border-surface-700">
                                <div class="text-muted-color w-1/2">{{ $t('extended.player_stats.clan_rank') }}</div>
                                <div class="text-surface-900 dark:text-surface-0 font-medium w-1/2">{{ clanRankLabel }}</div>
                            </li>
                            <li class="flex items-center py-4">
                                <div class="text-muted-color w-1/2">{{ $t('extended.player_stats.clan_rep') }}</div>
                                <div class="text-surface-900 dark:text-surface-0 font-medium w-1/2">{{ player.clan.rep?.toLocaleString() }}</div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <div v-if="player.matchmaking" class="card">
                <div class="font-semibold text-xl mb-4">{{ $t('extended.player_stats.mm_stats') }}</div>
                <div class="grid grid-cols-12 gap-8">
                    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                        <div class="flex justify-between mb-4">
                            <div class="w-full">
                                <span class="block text-muted-color font-medium mb-4">ELO</span>
                                <InputNumber v-if="editMode" v-model="editData.matchmaking.elo" :min="0" class="w-full" />
                                <div v-else class="font-medium text-xl" :class="{ 'text-green-500': player.matchmaking.elo >= 1200, 'text-yellow-500': player.matchmaking.elo >= 1000 && player.matchmaking.elo < 1200, 'text-red-500': player.matchmaking.elo < 1000 }">{{ player.matchmaking.elo }}</div>
                            </div>
                            <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                                <i class="pi pi-bolt text-purple-500 text-xl!"></i>
                            </div>
                        </div>
                    </div>
                    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                        <div class="flex justify-between mb-4">
                            <div class="w-full">
                                <span class="block text-muted-color font-medium mb-4">{{ $t('extended.matchmaking.games') }}</span>
                                <InputNumber v-if="editMode" v-model="editData.matchmaking.games" :min="0" class="w-full" />
                                <div v-else class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ player.matchmaking.games }}</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                        <div class="flex justify-between mb-4">
                            <div class="w-full">
                                <span class="block text-muted-color font-medium mb-4">{{ $t('extended.matchmaking.wins') }}</span>
                                <InputNumber v-if="editMode" v-model="editData.matchmaking.wins" :min="0" class="w-full" />
                                <div v-else class="text-green-500 font-medium text-xl">{{ player.matchmaking.wins }}</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                        <div class="flex justify-between mb-4">
                            <div>
                                <span class="block text-muted-color font-medium mb-4">{{ $t('extended.matchmaking.winrate') }}</span>
                                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ player.matchmaking.winrate }}%</div>
                            </div>
                        </div>
                    </div>
                </div>
                <ul class="list-none p-0 m-0 mt-4">
                    <li class="flex items-center py-4 border-b border-surface-200 dark:border-surface-700">
                        <div class="text-muted-color w-1/4">{{ $t('extended.matchmaking.kills') }}</div>
                        <div class="w-1/4">
                            <InputNumber v-if="editMode" v-model="editData.matchmaking.kills" :min="0" class="w-full" />
                            <div v-else class="text-surface-900 dark:text-surface-0 font-medium">{{ player.matchmaking.kills }}</div>
                        </div>
                        <div class="text-muted-color w-1/4">{{ $t('extended.matchmaking.deaths') }}</div>
                        <div class="w-1/4">
                            <InputNumber v-if="editMode" v-model="editData.matchmaking.deaths" :min="0" class="w-full" />
                            <div v-else class="text-surface-900 dark:text-surface-0 font-medium">{{ player.matchmaking.deaths }}</div>
                        </div>
                    </li>
                    <li class="flex items-center py-4">
                        <div class="text-muted-color w-1/4">{{ $t('extended.matchmaking.mvp') }}</div>
                        <div class="w-1/4">
                            <InputNumber v-if="editMode" v-model="editData.matchmaking.mvp" :min="0" class="w-full" />
                            <div v-else class="text-yellow-500 font-medium">{{ player.matchmaking.mvp }}</div>
                        </div>
                        <div class="text-muted-color w-1/4">{{ $t('extended.player_stats.mm_time') }}</div>
                        <div class="text-surface-900 dark:text-surface-0 font-medium w-1/4">{{ player.matchmaking.game_time || '0ч' }}</div>
                    </li>
                </ul>
            </div>

            <div v-if="player.score_chase" class="card">
                <div class="font-semibold text-xl mb-4">{{ $t('extended.player_stats.copchase_stats') }}</div>
                <div class="flex justify-between">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">{{ $t('extended.player_stats.score_chase') }}</span>
                        <div class="text-blue-500 font-medium text-2xl">{{ player.score_chase?.toLocaleString() }}</div>
                    </div>
                    <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-car text-blue-500 text-xl!"></i>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
