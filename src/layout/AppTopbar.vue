<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLayout } from '@/layout/composables/layout';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { setLocale, getLocale } from '@/i18n';
import AppConfigurator from './AppConfigurator.vue';
import Changelog from '@/components/Changelog.vue';
import DashboardRealtime from '@/components/DashboardRealtime.vue';
import api, { DASHBOARD_URL } from '@/service/api';

const { t } = useI18n();
const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();
const authStore = useAuthStore();
const router = useRouter();

const currentLocale = ref(getLocale());
const langMenu = ref();
const changelogVisible = ref(false);
const profileVisible = ref(false);
const profileLoading = ref(false);
const avatarUploading = ref(false);
const avatarUrl = ref(null);
const avatarInput = ref();
const CURRENT_RELEASE = '1.6.0';

const languageOptions = [
    { label: 'Русский', value: 'ru', code: 'RU' },
    { label: 'English', value: 'en', code: 'US' }
];

function toggleLangMenu(event) {
    langMenu.value.toggle(event);
}

function changeLocale(lang) {
    setLocale(lang);
    currentLocale.value = lang;
    langMenu.value.hide();
}

const serverMenu = ref();

const serverItems = computed(() => [
    { label: t('servers.server_labels.one'), value: 'one' },
    { label: t('servers.server_labels.two'), value: 'two' },
    { label: t('servers.server_labels.three'), value: 'three' }
]);

const currentServerLabel = computed(() => (authStore.currentServer ? t(`servers.server_labels.${authStore.currentServer}`) : t('common.none')));

function toggleServerMenu(event) {
    serverMenu.value.toggle(event);
}

function switchServer(server) {
    if (authStore.isServerUnlocked(server)) {
        authStore.switchServer(server);
        window.location.reload();
    } else {
        router.push({ name: 'unlock', query: { server } });
    }
}

async function goToControlPanel() {
    try {
        const { data } = await api.post('/cp/prepare');
        if (data.token) {
            window.open(`${DASHBOARD_URL}/cp?t=${encodeURIComponent(data.token)}`, '_blank');
        }
    } catch (err) {
        console.warn('cp access denied:', err.response?.data?.error || err.message);
    }
}

async function openProfileSettings() {
    profileVisible.value = true;
    profileLoading.value = true;

    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        const { data } = await api.get(`/admin/profile${serverParam}`);
        avatarUrl.value = data.profile?.avatar_url || null;
    } catch (err) {
        console.warn('profile load failed:', err.response?.data?.error || err.message);
    } finally {
        profileLoading.value = false;
    }
}

function chooseAvatar() {
    avatarInput.value?.click();
}

async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    avatarUploading.value = true;
    try {
        const form = new FormData();
        form.append('avatar', file);
        if (authStore.currentServer) form.append('server', authStore.currentServer);
        const { data } = await api.post('/admin/profile/avatar', form, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        avatarUrl.value = data.profile?.avatar_url || null;
    } catch (err) {
        console.warn('avatar upload failed:', err.response?.data?.message || err.message);
    } finally {
        avatarUploading.value = false;
        event.target.value = '';
    }
}

onMounted(() => {
    if (localStorage.getItem('dashboard_seen_release') !== CURRENT_RELEASE) {
        changelogVisible.value = true;
    }
});

watch(changelogVisible, (value) => {
    if (!value) {
        localStorage.setItem('dashboard_seen_release', CURRENT_RELEASE);
    }
});
</script>

<template>
    <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" @click="toggleMenu">
                <i class="pi pi-bars"></i>
            </button>
            <router-link to="/" class="layout-topbar-logo">
                <i class="pi pi-shield text-2xl text-primary"></i>
                <span>Admin Panel</span>
            </router-link>
            <div class="autumn-chip" title="Осенний режим">
                <span class="autumn-leaf">🍂</span>
                <span>October</span>
            </div>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-desktop-only flex items-center gap-2">
                <Button :label="currentServerLabel" icon="pi pi-server" text @click="toggleServerMenu" />
            </div>

            <DashboardRealtime v-if="authStore.user" class="layout-desktop-only" />

            <div class="layout-config-menu">
                <button type="button" class="layout-topbar-action" @click="changelogVisible = true">
                    <i class="pi pi-list"></i>
                </button>
                <button v-if="authStore.canAccessCP" type="button" class="layout-topbar-action" @click="goToControlPanel">
                    <i class="pi pi-cog"></i>
                </button>
                <button type="button" class="layout-topbar-action" @click="toggleLangMenu">
                    <i class="pi pi-globe"></i>
                </button>
                <button type="button" class="layout-topbar-action" @click="toggleDarkMode">
                    <i :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"></i>
                </button>
                <button type="button" class="layout-topbar-action" @click="openProfileSettings">
                    <i class="pi pi-user-edit"></i>
                </button>
                <div class="relative">
                    <button
                        v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'p-anchored-overlay-enter-active', leaveToClass: 'hidden', leaveActiveClass: 'p-anchored-overlay-leave-active', hideOnOutsideClick: true }"
                        type="button"
                        class="layout-topbar-action layout-topbar-action-highlight"
                    >
                        <i class="pi pi-palette"></i>
                    </button>
                    <AppConfigurator />
                </div>
            </div>

            <div v-if="authStore.user" class="layout-mobile-only flex items-center gap-2">
                <span class="text-muted-color text-sm">{{ authStore.user.name }}</span>
                <Tag v-if="authStore.admin" size="small">Lv.{{ authStore.admin.level }}</Tag>
            </div>

            <button
                class="layout-topbar-menu-button layout-topbar-action"
                v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'p-anchored-overlay-enter-active', leaveToClass: 'hidden', leaveActiveClass: 'p-anchored-overlay-leave-active', hideOnOutsideClick: true }"
            >
                <i class="pi pi-ellipsis-v"></i>
            </button>

            <div class="layout-topbar-menu hidden lg:block">
                <div class="layout-topbar-menu-content">
                    <button type="button" class="layout-topbar-action layout-mobile-item" @click="changelogVisible = true">
                        <i class="pi pi-list"></i>
                        <span>Changelog</span>
                    </button>
                    <button type="button" class="layout-topbar-action layout-mobile-item" @click="toggleServerMenu">
                        <i class="pi pi-server"></i>
                        <span>{{ currentServerLabel }}</span>
                    </button>
                    <button type="button" class="layout-topbar-action layout-mobile-item" @click="toggleLangMenu">
                        <i class="pi pi-globe"></i>
                        <span>{{ t('common.language') }}</span>
                    </button>
                    <button type="button" class="layout-topbar-action layout-mobile-item" @click="toggleDarkMode">
                        <i :class="['pi', isDarkTheme ? 'pi-moon' : 'pi-sun']"></i>
                        <span>{{ t('common.theme') }}</span>
                    </button>
                    <button v-if="authStore.canAccessCP" type="button" class="layout-topbar-action layout-mobile-item" @click="goToControlPanel">
                        <i class="pi pi-cog"></i>
                        <span>{{ t('common.control_panel') }}</span>
                    </button>
                    <button type="button" class="layout-topbar-action layout-mobile-item" @click="openProfileSettings">
                        <i class="pi pi-user-edit"></i>
                        <span>Профиль</span>
                    </button>
                    <div v-if="authStore.user" class="layout-desktop-item flex items-center gap-2 px-4">
                        <span class="text-muted-color">{{ authStore.user.name }}</span>
                        <Tag v-if="authStore.admin" size="small">Lv.{{ authStore.admin.level }}</Tag>
                    </div>
                    <button type="button" class="layout-topbar-action" @click="authStore.logout">
                        <i class="pi pi-sign-out"></i>
                        <span>{{ t('common.logout') }}</span>
                    </button>
                </div>
            </div>

            <Menu ref="serverMenu" :model="serverItems" popup>
                <template #item="{ item }">
                    <div class="flex items-center gap-2 p-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800" @click="switchServer(item.value)">
                        <i class="pi pi-server"></i>
                        <span>{{ item.label }}</span>
                        <i v-if="item.value === authStore.currentServer" class="pi pi-check text-green-500 ml-auto"></i>
                        <i v-else-if="authStore.isServerUnlocked(item.value)" class="pi pi-unlock text-green-500 ml-auto"></i>
                        <i v-else class="pi pi-lock text-muted-color ml-auto"></i>
                    </div>
                </template>
            </Menu>
            <Menu ref="langMenu" :model="languageOptions" popup>
                <template #item="{ item }">
                    <div class="flex items-center gap-2 p-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800" @click="changeLocale(item.value)">
                        <span class="font-mono text-xs bg-surface-200 dark:bg-surface-700 px-1.5 py-0.5 rounded">{{ item.code }}</span>
                        <span>{{ item.label }}</span>
                        <i v-if="item.value === currentLocale" class="pi pi-check text-green-500 ml-auto"></i>
                    </div>
                </template>
            </Menu>
        </div>

        <Changelog v-model:visible="changelogVisible" />
        <Dialog v-model:visible="profileVisible" modal header="Профиль" :style="{ width: '420px', maxWidth: 'calc(100vw - 2rem)' }">
            <div class="flex flex-col gap-4">
                <div class="flex items-center gap-4">
                    <div class="profile-avatar-preview">
                        <img v-if="avatarUrl" :src="avatarUrl" alt="avatar" />
                        <i v-else class="pi pi-user text-3xl text-muted-color"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="font-semibold">{{ authStore.user?.name }}</div>
                        <div class="text-sm text-muted-color">Аватар будет виден в списке онлайн-админов</div>
                    </div>
                </div>

                <input ref="avatarInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="uploadAvatar" />
                <Button :label="avatarUploading ? 'Загружаю...' : 'Загрузить аватар'" icon="pi pi-upload" :loading="avatarUploading || profileLoading" @click="chooseAvatar" />
            </div>
        </Dialog>
    </div>
</template>

<style scoped>
.profile-avatar-preview {
    width: 72px;
    height: 72px;
    border-radius: 999px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-ground);
    border: 1px solid var(--surface-border);
    flex-shrink: 0;
}

.profile-avatar-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
</style>
