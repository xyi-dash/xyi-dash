<script setup>
import api from '@/service/api';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'primevue/usetoast';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const authStore = useAuthStore();
const toast = useToast();

const loading = ref(false);
const historyLoading = ref(false);
const spinning = ref(false);
const status = ref(null);
const history = ref([]);
const prize = ref(null);
const rotation = ref(0);
const tick = ref(Date.now());
let timer = null;

const segments = computed(() => status.value?.segments || []);
const segmentAngle = computed(() => (segments.value.length ? 360 / segments.value.length : 0));

const remainingSeconds = computed(() => {
    const seconds = Number(status.value?.remaining_seconds || 0);
    if (!seconds) return 0;
    const loadedAgo = Math.floor((Date.now() - tick.value) / 1000);
    return Math.max(0, seconds - loadedAgo);
});

const remainingLabel = computed(() => {
    const seconds = remainingSeconds.value;
    if (!seconds) return 'Можно крутить';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (days > 0) return `${days}д ${hours}ч ${minutes}м`;
    if (hours > 0) return `${hours}ч ${minutes}м ${secs}с`;
    return `${minutes}м ${secs}с`;
});

const wheelGradient = computed(() => {
    if (!segments.value.length) return '#1f2937';
    return `conic-gradient(${segments.value
        .map((segment, index) => {
            const start = index * segmentAngle.value;
            const end = (index + 1) * segmentAngle.value;
            return `${segment.color} ${start}deg ${end}deg`;
        })
        .join(', ')})`;
});

const prizeHints = {
    promotion: 'Только для 1-4 уровня. Повышение максимум до 5 уровня.',
    warning_remove: 'Снятие одного административного предупреждения.',
    points: 'Рандомно от 1 до 15 баллов.',
    money: 'Рандомно от 50 000 до 500 000 виртов. Чем больше сумма, тем ниже шанс.',
    donate: 'Рандомно от 25 до 250 доната.',
    accessory: 'Часто: Сердце на грудь, Катана на спину. Средне: Крылья, Нимб, Вьетнамки, Водяной плащ, Аура. Редко: Агент Банан, Агент Тыква, Агент Бургер.',
};

onMounted(() => {
    loadStatus();
    loadHistory();
    timer = setInterval(() => {
        if (status.value?.remaining_seconds) {
            status.value.remaining_seconds = remainingSeconds.value;
            tick.value = Date.now();
        }
    }, 1000);
});

onBeforeUnmount(() => {
    if (timer) clearInterval(timer);
});

function serverParam() {
    return authStore.currentServer ? `?server=${authStore.currentServer}` : '';
}

function segmentStyle(index) {
    return {
        '--angle': `${index * segmentAngle.value + segmentAngle.value / 2}deg`,
        '--label-color': segments.value[index]?.color || '#8b5cf6',
    };
}

async function loadStatus() {
    loading.value = true;
    try {
        const { data } = await api.get(`/admin/luck-wheel${serverParam()}`);
        status.value = data;
        tick.value = Date.now();
    } catch {
        toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось загрузить колесо удачи', life: 3500 });
    } finally {
        loading.value = false;
    }
}

async function loadHistory() {
    historyLoading.value = true;
    try {
        const { data } = await api.get(`/admin/luck-wheel/history${serverParam()}`);
        history.value = data.data || [];
    } catch {
        history.value = [];
    } finally {
        historyLoading.value = false;
    }
}

async function spin() {
    if (spinning.value || !status.value?.can_spin) return;

    spinning.value = true;
    prize.value = null;

    try {
        const { data } = await api.post(`/admin/luck-wheel/spin${serverParam()}`);
        const prizeData = data.prize;
        const index = Math.max(0, segments.value.findIndex((segment) => segment.type === prizeData.type));
        const center = index * segmentAngle.value + segmentAngle.value / 2;
        const current = ((rotation.value % 360) + 360) % 360;
        const target = (360 - center) % 360;
        const delta = (target - current + 360) % 360;
        rotation.value += 1800 + delta;

        window.setTimeout(async () => {
            prize.value = prizeData;
            status.value = data.status;
            tick.value = Date.now();
            await loadHistory();
        }, 3900);
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Ошибка', detail: error.response?.data?.message || 'Прокрутка сейчас недоступна', life: 4000 });
    } finally {
        window.setTimeout(() => {
            spinning.value = false;
        }, 4100);
    }
}
</script>

<template>
    <div class="luck-page">
        <section class="luck-hero">
            <div>
                <div class="eyebrow">Пятничный бонус</div>
                <h1>Колесо удачи</h1>
                <p>Раз в неделю администраторы 1-6 уровня могут прокрутить колесо и зафиксировать приз скрином.</p>
            </div>
            <div class="hero-status">
                <Tag v-if="status?.test_mode" severity="warn" value="Тестовый режим" />
                <Tag v-else :severity="status?.can_spin ? 'success' : 'secondary'" :value="status?.can_spin ? 'Доступно' : 'Ожидание'" />
                <span>{{ status?.now_msk || '-' }} МСК</span>
            </div>
        </section>

        <ProgressSpinner v-if="loading" class="flex justify-center py-8" />

        <template v-else>
            <section class="wheel-layout">
                <div class="wheel-card">
                    <div class="wheel-wrap">
                        <div class="wheel-pointer"></div>
                        <div class="wheel" :style="{ background: wheelGradient, transform: `rotate(${rotation}deg)` }">
                            <div v-for="(segment, index) in segments" :key="segment.type" class="wheel-label" :style="segmentStyle(index)">
                                <span>{{ segment.label }}</span>
                            </div>
                            <div class="wheel-core">
                                <span>MONSER DM</span>
                                <strong>LUCK</strong>
                            </div>
                        </div>
                    </div>

                    <Button
                        class="spin-button"
                        :label="spinning ? 'Крутим...' : 'Крутить колесо'"
                        icon="pi pi-bolt"
                        :disabled="spinning || !status?.can_spin"
                        :loading="spinning"
                        @click="spin"
                    />
                    <p class="availability">{{ status?.availability_text }}</p>
                </div>

                <div class="info-stack">
                    <article class="info-card countdown">
                        <span>До следующей прокрутки</span>
                        <strong>{{ remainingLabel }}</strong>
                        <small>Ограничение считается по пятницам, время МСК.</small>
                    </article>

                    <article v-if="prize" class="result-card" :style="{ '--prize-color': prize.color || '#8b5cf6' }">
                        <span>Выпало</span>
                        <strong>{{ prize.label }}</strong>
                        <p>{{ prize.description }}</p>
                        <small>Сделай скрин этой карточки и передай руководству.</small>
                    </article>

                    <article v-else-if="status?.last_spin" class="result-card muted-result">
                        <span>Последний результат</span>
                        <strong>{{ status.last_spin.prize_label }}</strong>
                        <p>{{ status.last_spin.spun_at }} МСК</p>
                    </article>

                    <article class="segments-card">
                        <h3>Что может выпасть</h3>
                        <div class="segment-list">
                            <div v-for="segment in segments" :key="segment.type" class="segment-row">
                                <i :style="{ background: segment.color }"></i>
                                <div>
                                    <span>{{ segment.label }}</span>
                                    <small>{{ prizeHints[segment.type] }}</small>
                                </div>
                            </div>
                        </div>
                    </article>
                </div>
            </section>

            <section class="history-card">
                <div class="history-head">
                    <div>
                        <h2>История прокрутов</h2>
                        <p>Последние 50 результатов по текущему серверу.</p>
                    </div>
                    <Button icon="pi pi-refresh" label="Обновить" outlined :loading="historyLoading" @click="loadHistory" />
                </div>

                <div class="history-table">
                    <div class="history-row history-header">
                        <span>Дата</span>
                        <span>Админ</span>
                        <span>Уровень</span>
                        <span>Выпало</span>
                        <span>Режим</span>
                    </div>
                    <div v-if="!history.length" class="empty-history">История пока пустая</div>
                    <div v-for="row in history" :key="row.id" class="history-row">
                        <span>{{ row.spun_at }} МСК</span>
                        <strong>{{ row.admin_name }}</strong>
                        <span>Lv.{{ row.admin_level }}</span>
                        <span class="prize-cell">{{ row.prize_label }}</span>
                        <Tag :severity="row.is_test ? 'warn' : 'success'" :value="row.is_test ? 'Тест' : 'Боевой'" />
                    </div>
                </div>
            </section>
        </template>
    </div>
</template>

<style scoped>
.luck-page {
    max-width: 1180px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.luck-hero,
.wheel-card,
.info-card,
.result-card,
.segments-card,
.history-card {
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 8px;
    background: rgba(18, 18, 22, 0.96);
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.24);
}

.luck-hero {
    min-height: 150px;
    padding: 26px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
}

.eyebrow {
    color: #a78bfa;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0;
    font-size: 12px;
}

.luck-hero h1 {
    margin: 6px 0 8px;
    color: #fff;
    font-size: 34px;
}

.luck-hero p,
.availability,
.result-card p,
.info-card small,
.result-card small,
.history-card p {
    color: #94a3b8;
}

.hero-status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
}

.wheel-layout {
    display: grid;
    grid-template-columns: minmax(380px, 1.04fr) minmax(320px, 0.96fr);
    gap: 18px;
}

.wheel-card {
    min-height: 580px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    overflow: hidden;
}

.wheel-wrap {
    position: relative;
    width: min(430px, 76vw);
    aspect-ratio: 1;
    display: grid;
    place-items: center;
}

.wheel-pointer {
    position: absolute;
    left: 50%;
    top: -2px;
    z-index: 3;
    width: 36px;
    height: 42px;
    transform: translateX(-50%);
    clip-path: polygon(50% 100%, 0 0, 100% 0);
    background: linear-gradient(180deg, #ffffff, #cbd5e1);
    filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.45));
}

.wheel {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    transition: transform 3.9s cubic-bezier(0.15, 0.85, 0.18, 1);
    position: relative;
    overflow: hidden;
    box-shadow: inset 0 0 0 10px rgba(255, 255, 255, 0.08), inset 0 0 0 42px rgba(255, 255, 255, 0.06), inset 0 0 0 43px rgba(255, 255, 255, 0.16), 0 30px 70px rgba(0, 0, 0, 0.35);
}

.wheel-label {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 2;
    transform: rotate(var(--angle)) translateY(-132px) rotate(90deg);
    transform-origin: center;
    width: 118px;
    margin-left: -59px;
    margin-top: -16px;
    display: flex;
    justify-content: center;
    pointer-events: none;
}

.wheel-label span {
    max-width: 118px;
    padding: 5px 8px;
    border-radius: 8px;
    background: rgba(2, 6, 23, 0.42);
    border: 1px solid rgba(255, 255, 255, 0.16);
    color: #fff;
    font-size: 12px;
    font-weight: 900;
    line-height: 1.1;
    text-align: center;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7);
}

.wheel-core {
    position: absolute;
    inset: 50%;
    width: 124px;
    height: 124px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(circle, #172033 0%, #0f172a 70%);
    border: 1px solid rgba(255, 255, 255, 0.16);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
    z-index: 4;
    box-shadow: 0 16px 38px rgba(0, 0, 0, 0.36);
}

.wheel-core span {
    color: #94a3b8;
    font-size: 11px;
}

.wheel-core strong {
    font-size: 22px;
}

.spin-button {
    min-width: 220px;
}

.info-stack {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.info-card,
.result-card,
.segments-card,
.history-card {
    padding: 22px;
}

.countdown strong,
.result-card strong {
    display: block;
    margin-top: 8px;
    color: #fff;
    font-size: 30px;
}

.result-card {
    border-color: color-mix(in srgb, var(--prize-color) 55%, transparent);
    background: linear-gradient(135deg, color-mix(in srgb, var(--prize-color) 18%, transparent), rgba(18, 18, 22, 0.96));
}

.muted-result {
    --prize-color: #64748b;
}

.segments-card h3,
.history-card h2 {
    margin: 0 0 14px;
}

.segment-list {
    display: grid;
    gap: 10px;
}

.segment-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-height: 42px;
    color: #e5e7eb;
}

.segment-row i {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-top: 4px;
    flex: 0 0 auto;
}

.segment-row span {
    display: block;
    font-weight: 800;
}

.segment-row small {
    display: block;
    margin-top: 3px;
    color: #94a3b8;
    line-height: 1.35;
}

.history-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 18px;
}

.history-head p {
    margin: 4px 0 0;
}

.history-table {
    display: grid;
    gap: 0;
    overflow-x: auto;
}

.history-row {
    min-width: 760px;
    display: grid;
    grid-template-columns: 190px 1fr 90px 1.2fr 100px;
    align-items: center;
    gap: 12px;
    min-height: 46px;
    padding: 0 10px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.history-header {
    min-height: 38px;
    background: rgba(255, 255, 255, 0.06);
    color: #cbd5e1;
    font-weight: 800;
}

.prize-cell {
    color: #a78bfa;
    font-weight: 800;
}

.empty-history {
    padding: 28px 10px;
    color: #94a3b8;
    text-align: center;
}

@media (max-width: 920px) {
    .luck-hero,
    .wheel-layout {
        grid-template-columns: 1fr;
    }

    .luck-hero {
        flex-direction: column;
        align-items: flex-start;
    }

    .hero-status {
        align-items: flex-start;
    }
}
</style>
