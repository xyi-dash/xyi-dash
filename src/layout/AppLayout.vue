<script setup>
import { useLayout } from '@/layout/composables/layout';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import AppFooter from './AppFooter.vue';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';

const { layoutConfig, layoutState, hideMobileMenu } = useLayout();
const authStore = useAuthStore();
const toast = useToast();

let cardPollInterval = null;
let cardSoundArmed = false;
let previousPendingCardsCount = 0;
const cardNotifyText = {
    summary: 'Новая карточка',
    detail: 'В ожидании появилась новая карточка'
};

function armCardSound() {
    cardSoundArmed = true;
}

function playCardSound() {
    if (!cardSoundArmed) return;

    try {
        const audio = new Audio('/sounds/card-notification.mp3');
        audio.volume = 0.9;
        audio.play().catch(() => {});
    } catch (error) {
        // Visual notification still works if the browser refuses sound.
    }
}

async function pollPendingCards(silent = true) {
    if (!authStore.canReviewCards) return;

    const count = await authStore.refreshPendingCardsCount();
    if (previousPendingCardsCount > 0 && count > previousPendingCardsCount) {
        playCardSound();
        toast.add({ severity: 'info', summary: cardNotifyText.summary, detail: cardNotifyText.detail, life: 5000 });
    }
    previousPendingCardsCount = count;
}

function startCardPolling() {
    if (cardPollInterval) return;
    pollPendingCards(false);
    cardPollInterval = setInterval(() => {
        pollPendingCards(true);
    }, 10000);
}

function stopCardPolling() {
    if (cardPollInterval) {
        clearInterval(cardPollInterval);
        cardPollInterval = null;
    }
}

const welcomeVisible = ref(false);
const welcomeKey = 'monser_ecosystem_welcome_2026_06_04';
const welcomeText = {
    title: '\u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c \u0432 \u044d\u043a\u043e\u0441\u0438\u0441\u0442\u0435\u043c\u0443 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f \u043f\u0440\u043e\u0435\u043a\u0442\u043e\u043c Monser DM',
    subtitle: '\u041c\u044b \u043d\u0430\u0447\u0438\u043d\u0430\u0435\u043c \u043f\u0435\u0440\u0435\u043d\u043e\u0441\u0438\u0442\u044c \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043f\u0440\u043e\u0435\u043a\u0442\u043e\u043c \u0432 \u0435\u0434\u0438\u043d\u044b\u0439 \u0446\u0435\u043d\u0442\u0440.',
    body: '\u0412 \u0431\u043b\u0438\u0436\u0430\u0439\u0448\u0435\u0435 \u0432\u0440\u0435\u043c\u044f \u0437\u0434\u0435\u0441\u044c \u043f\u043e\u044f\u0432\u044f\u0442\u0441\u044f \u043e\u0441\u043d\u043e\u0432\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0447\u0438\u0435 \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438: \u0432\u044b\u0434\u0430\u0447\u0430 \u0431\u0430\u043b\u043b\u043e\u0432, \u0443\u0441\u0442\u043d\u044b\u0435 \u043f\u0440\u0435\u0434\u0443\u043f\u0440\u0435\u0436\u0434\u0435\u043d\u0438\u044f, \u0431\u044b\u0441\u0442\u0440\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u043f\u043e \u0438\u0433\u0440\u043e\u043a\u0430\u043c \u0438 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430\u043c, \u043a\u0438\u043a \u0441\u043e \u0432\u0441\u0435\u0445 \u0431\u0435\u0441\u0435\u0434 \u043e\u0434\u043d\u043e\u0439 \u043a\u043d\u043e\u043f\u043a\u043e\u0439 \u0438 \u043c\u043d\u043e\u0433\u043e\u0435 \u0434\u0440\u0443\u0433\u043e\u0435.',
    changesTitle: '\u0427\u0442\u043e \u043c\u0435\u043d\u044f\u0435\u0442\u0441\u044f',
    changes: '\u0410\u0434\u043c\u0438\u043d-\u043f\u0430\u043d\u0435\u043b\u044c \u043f\u043e\u0441\u0442\u0435\u043f\u0435\u043d\u043d\u043e \u0441\u0442\u0430\u043d\u0435\u0442 \u043d\u0435 \u043f\u0440\u043e\u0441\u0442\u043e \u043c\u0435\u0441\u0442\u043e\u043c \u0434\u043b\u044f \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0430 \u0434\u0430\u043d\u043d\u044b\u0445, \u0430 \u043f\u043e\u043b\u043d\u043e\u0446\u0435\u043d\u043d\u043e\u0439 \u0441\u0438\u0441\u0442\u0435\u043c\u043e\u0439 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f Monser DM: \u043c\u0435\u043d\u044c\u0448\u0435 \u0440\u0443\u0447\u043d\u043e\u0439 \u0440\u0443\u0442\u0438\u043d\u044b, \u0431\u043e\u043b\u044c\u0448\u0435 \u043f\u0440\u043e\u0437\u0440\u0430\u0447\u043d\u043e\u0441\u0442\u0438 \u0438 \u0431\u044b\u0441\u0442\u0440\u044b\u0445 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439 \u0432 \u043e\u0434\u043d\u043e\u043c \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0435.',
    ok: '\u041f\u043e\u043d\u044f\u0442\u043d\u043e'
};

onMounted(() => {
    if (localStorage.getItem(welcomeKey) !== '1') {
        welcomeVisible.value = true;
    }
    window.addEventListener('pointerdown', armCardSound, { once: true });
    window.addEventListener('keydown', armCardSound, { once: true });
    startCardPolling();
});

onUnmounted(() => {
    stopCardPolling();
    window.removeEventListener('pointerdown', armCardSound);
    window.removeEventListener('keydown', armCardSound);
});

function closeWelcome() {
    localStorage.setItem(welcomeKey, '1');
    welcomeVisible.value = false;
}

const containerClass = computed(() => {
    return {
        'layout-overlay': layoutConfig.menuMode === 'overlay',
        'layout-static': layoutConfig.menuMode === 'static',
        'layout-overlay-active': layoutState.overlayMenuActive,
        'layout-mobile-active': layoutState.mobileMenuActive,
        'layout-static-inactive': layoutState.staticMenuInactive
    };
});
</script>

<template>
    <div class="layout-wrapper" :class="containerClass" @click="armCardSound">
        <AppTopbar />
        <AppSidebar />
        <div class="layout-main-container">
            <div class="layout-main">
                <router-view />
            </div>
            <AppFooter />
        </div>
        <div class="layout-mask animate-fadein" @click="hideMobileMenu" />
    </div>
    <Toast />

    <Dialog v-model:visible="welcomeVisible" modal :closable="false" :draggable="false" class="w-[92vw] max-w-[720px]">
        <template #header>
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <i class="pi pi-sitemap text-primary text-xl"></i>
                </div>
                <div>
                    <div class="text-xl font-semibold">{{ welcomeText.title }}</div>
                    <div class="text-sm text-muted-color mt-1">{{ welcomeText.subtitle }}</div>
                </div>
            </div>
        </template>

        <div class="flex flex-col gap-4 leading-relaxed">
            <p class="m-0 text-surface-700 dark:text-surface-200">
                {{ welcomeText.body }}
            </p>
            <div class="p-4 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                <div class="font-semibold mb-2">{{ welcomeText.changesTitle }}</div>
                <div class="text-sm text-muted-color">
                    {{ welcomeText.changes }}
                </div>
            </div>
        </div>

        <template #footer>
            <Button :label="welcomeText.ok" icon="pi pi-check" @click="closeWelcome" />
        </template>
    </Dialog>
</template>
