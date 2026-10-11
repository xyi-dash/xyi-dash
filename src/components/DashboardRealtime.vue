<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import api from '@/service/api';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const onlineUsers = ref([]);
const messages = ref([]);
const chatVisible = ref(false);
const loading = ref(false);
const sending = ref(false);
const messageText = ref('');
const messagesRef = ref(null);

let onlineTimer = null;
let chatTimer = null;

function serverQuery() {
    return authStore.currentServer ? `?server=${authStore.currentServer}` : '';
}

function initials(name) {
    return String(name || '?').slice(0, 2).toUpperCase();
}

function formatTime(value) {
    return value ? new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
}

async function ping() {
    if (!authStore.isAuthenticated) return;

    try {
        const { data } = await api.post(`/admin/realtime/ping${serverQuery()}`);
        onlineUsers.value = data.online || [];
    } catch (err) {
        console.warn('realtime ping failed:', err.response?.data?.message || err.message);
    }
}

async function loadChat() {
    if (!authStore.isAuthenticated) return;

    loading.value = true;
    try {
        const { data } = await api.get(`/admin/realtime/chat${serverQuery()}`);
        messages.value = data.messages || [];
        await nextTick();
        scrollDown();
    } catch (err) {
        console.warn('chat load failed:', err.response?.data?.message || err.message);
    } finally {
        loading.value = false;
    }
}

async function openChat() {
    chatVisible.value = true;
    await loadChat();

    if (!chatTimer) {
        chatTimer = setInterval(loadChat, 10000);
    }
}

function closeChat() {
    if (chatTimer) {
        clearInterval(chatTimer);
        chatTimer = null;
    }
}

function scrollDown() {
    if (messagesRef.value) {
        messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
    }
}

async function sendMessage() {
    const text = messageText.value.trim();
    if (!text || sending.value) return;

    sending.value = true;
    try {
        const { data } = await api.post(`/admin/realtime/chat${serverQuery()}`, { message: text });
        messages.value = [...messages.value, data.message].slice(-80);
        messageText.value = '';
        await nextTick();
        scrollDown();
    } catch (err) {
        console.warn('chat send failed:', err.response?.data?.message || err.message);
    } finally {
        sending.value = false;
    }
}

onMounted(() => {
    ping();
    onlineTimer = setInterval(ping, 30000);
});

onBeforeUnmount(() => {
    if (onlineTimer) clearInterval(onlineTimer);
    closeChat();
});
</script>

<template>
    <div class="dashboard-realtime">
        <div class="online-stack" aria-label="Пользователи онлайн">
            <div
                v-for="user in onlineUsers.slice(0, 5)"
                :key="user.id"
                class="online-avatar"
                :title="`${user.nickname} · ${user.server}`"
            >
                <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.nickname" />
                <span v-else>{{ initials(user.nickname) }}</span>
            </div>
            <div v-if="onlineUsers.length > 5" class="online-more" :title="onlineUsers.map((u) => u.nickname).join(', ')">+{{ onlineUsers.length - 5 }}</div>
        </div>

        <button type="button" class="layout-topbar-action chat-button" title="Общий чат" @click="openChat">
            <i class="pi pi-comments"></i>
        </button>

        <Dialog v-model:visible="chatVisible" modal header="Общий чат" :style="{ width: '440px', maxWidth: 'calc(100vw - 2rem)' }" @hide="closeChat">
            <div class="chat-panel">
                <div ref="messagesRef" class="chat-messages">
                    <div v-if="loading && messages.length === 0" class="chat-empty">Загружаю сообщения...</div>
                    <div v-else-if="messages.length === 0" class="chat-empty">
                        <i class="pi pi-comments"></i>
                        <span>Пока тихо, как в осеннем дворе.</span>
                    </div>
                    <div v-for="message in messages" :key="message.id" class="chat-message">
                        <div class="chat-avatar">
                            <img v-if="message.avatar_url" :src="message.avatar_url" :alt="message.nickname" />
                            <span v-else>{{ initials(message.nickname) }}</span>
                        </div>
                        <div class="chat-bubble">
                            <div class="chat-meta">
                                <span>{{ message.nickname }}</span>
                                <small>{{ formatTime(message.created_at) }}</small>
                            </div>
                            <div class="chat-text">{{ message.message }}</div>
                        </div>
                    </div>
                </div>

                <form class="chat-form" @submit.prevent="sendMessage">
                    <InputText v-model="messageText" maxlength="500" placeholder="Написать сообщение..." class="flex-1" />
                    <Button icon="pi pi-send" :loading="sending" :disabled="!messageText.trim()" type="submit" />
                </form>
            </div>
        </Dialog>
    </div>
</template>

<style scoped>
.dashboard-realtime,
.online-stack {
    display: flex;
    align-items: center;
}

.dashboard-realtime {
    gap: 0.5rem;
}

.online-stack {
    min-width: 44px;
    justify-content: flex-end;
    padding-inline: 0.25rem;
}

.online-avatar,
.online-more,
.chat-avatar {
    width: 30px;
    height: 30px;
    border-radius: 999px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--primary-color), var(--surface-card) 75%);
    color: var(--primary-contrast-color);
    font-size: 0.72rem;
    font-weight: 700;
    border: 2px solid var(--surface-card);
}

.online-avatar {
    margin-left: -8px;
}

.online-avatar:first-child {
    margin-left: 0;
}

.online-avatar img,
.chat-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.online-more {
    margin-left: -8px;
    background: var(--surface-border);
    color: var(--text-color);
}

.chat-button {
    position: relative;
}

.chat-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.chat-messages {
    height: 360px;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-right: 0.25rem;
}

.chat-empty {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.65rem;
    color: var(--text-color-secondary);
    text-align: center;
}

.chat-empty i {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #d97706;
    background: color-mix(in srgb, #f59e0b, transparent 88%);
    border: 1px solid color-mix(in srgb, #d97706, transparent 72%);
}

.chat-message {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
}

.chat-avatar {
    width: 34px;
    height: 34px;
    flex-shrink: 0;
}

.chat-bubble {
    min-width: 0;
    flex: 1;
    background: var(--surface-ground);
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    padding: 0.55rem 0.7rem;
}

.chat-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.25rem;
    font-weight: 700;
}

.chat-meta small {
    color: var(--text-color-secondary);
    font-weight: 500;
}

.chat-text {
    white-space: pre-wrap;
    word-break: break-word;
}

.chat-form {
    display: flex;
    gap: 0.5rem;
}
</style>
