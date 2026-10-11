<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { redirectToDashboard } from '@/service/api';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const password = ref('');
const loading = ref(false);
const error = ref('');
const maintenanceCountdown = ref(0);
let maintenanceTimer = null;

const targetServer = computed(() => route.query.server || authStore.currentServer || authStore.user?.server);

const serverLabel = computed(() => t(`servers.server_labels.${targetServer.value}`));
const isAdditionalServer = computed(() => authStore.hasUnlockedServers);
const sessionExpired = computed(() => route.query.expired === '1');

const ownerNickname = 'Exfil_Chidori';
const isOwner = computed(() => authStore.isOwner || String(authStore.user?.name || '').toLowerCase() === ownerNickname.toLowerCase());
const maintenanceEnabled = computed(() => !!authStore.maintenance?.enabled);
const maintenanceBlocking = computed(() => maintenanceEnabled.value && !isOwner.value);
const maintenanceActive = computed(() => maintenanceEnabled.value);
const maintenanceReason = computed(() => authStore.maintenance?.reason || 'Администрация временно закрыла доступ к панели.');
const maintenanceTimerText = computed(() => {
    if (!maintenanceCountdown.value) return '';
    const minutes = Math.max(1, Math.ceil(maintenanceCountdown.value / 60));
    return `До окончания технических шоколадок осталось: ${minutes} мин.`;
});

function syncMaintenanceCountdown() {
    maintenanceCountdown.value = authStore.maintenance?.remaining_seconds || 0;
    if (maintenanceTimer) clearInterval(maintenanceTimer);

    if (maintenanceCountdown.value > 0) {
        maintenanceTimer = setInterval(() => {
            maintenanceCountdown.value = Math.max(0, maintenanceCountdown.value - 1);
        }, 1000);
    }
}

watch(() => authStore.maintenance, syncMaintenanceCountdown, { immediate: true, deep: true });
onUnmounted(() => {
    if (maintenanceTimer) clearInterval(maintenanceTimer);
});

onMounted(() => {
    if (authStore.hasUnlockedServers && !route.query.server && !sessionExpired.value) router.push('/');
});

async function handleUnlock() {
    if (maintenanceBlocking.value) {
        error.value = authStore.maintenance?.message || maintenanceReason.value;
        return;
    }

    if (!password.value) {
        error.value = t('auth.unlock.enter_password');
        return;
    }

    loading.value = true;
    error.value = '';

    const result = await authStore.unlockServer(password.value, targetServer.value);

    loading.value = false;

    if (result.success) {
        if (isAdditionalServer.value) authStore.switchServer(targetServer.value);
        router.push('/');
    } else {
        error.value = result.message || t('auth.unlock.invalid_password');
    }
}

function goBack() {
    if (authStore.hasUnlockedServers) {
        router.push('/');
    } else {
        redirectToDashboard();
    }
}
</script>

<template>
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
        <div class="flex flex-col items-center justify-center">
            <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
                    <div class="text-center mb-8">
                        <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">
                            {{ $t('auth.unlock.title') }}
                        </div>
                        <span class="text-muted-color font-medium">
                            {{ $t('auth.unlock.subtitle') }}
                        </span>
                    </div>

                    <Message v-if="sessionExpired" severity="warn" class="mb-6">{{ $t('auth.unlock.session_expired') }}</Message>

                    <Message v-if="maintenanceActive" severity="warn" class="mb-6">
                        <div class="font-semibold mb-1">{{ 'Доступ временно закрыт' }}</div>
                        <div>{{ maintenanceReason }}</div>
                        <div v-if="maintenanceTimerText" class="mt-2 font-semibold">{{ maintenanceTimerText }}</div>
                    </Message>

                    <div v-if="authStore.user" class="mb-6 text-center">
                        <span class="text-surface-600 dark:text-surface-400">{{ $t('auth.unlock.logged_as') }} </span>
                        <span class="text-primary font-semibold">{{ authStore.user.name }}</span>
                        <div v-if="targetServer" class="mt-2">
                            <Tag severity="info">{{ serverLabel }}</Tag>
                        </div>
                    </div>

                    <div>
                        <label for="password" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">{{ $t('auth.unlock.password') }}</label>
                        <Password id="password" v-model="password" :placeholder="$t('auth.unlock.password_placeholder')" :toggleMask="true" class="w-full mb-4" inputClass="w-full" :feedback="false" :disabled="maintenanceBlocking" @keyup.enter="handleUnlock" />

                        <Message v-if="error" severity="error" class="mb-4">{{ error }}</Message>

                        <Button :label="$t('auth.unlock.login')" class="w-full" :loading="loading" :disabled="maintenanceBlocking" @click="handleUnlock" />

                        <Button :label="authStore.hasUnlockedServers ? $t('auth.unlock.cancel') : $t('auth.unlock.back_dashboard')" class="w-full mt-4" severity="secondary" text @click="goBack" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
