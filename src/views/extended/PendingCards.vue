<template>
  <div class="card">
    <div class="flex items-center gap-2 mb-6">
      <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
      <div class="font-semibold text-xl">Карточки в ожидании</div>
    </div>
    <div class="text-muted-color mb-6">Рассмотрение заявок от старших администраторов</div>
    <div v-if="loading" class="flex justify-center py-8"><ProgressSpinner /></div>
    <div v-else-if="cards.length === 0" class="text-center py-8 text-muted-color">Нет карточек в ожидании</div>
    <div v-else class="grid grid-cols-1 gap-4">
      <div v-for="card in cards" :key="card.id" class="card-item p-4 border-round">
        <div class="flex justify-between align-items-start mb-3">
          <div>
            <div class="flex align-items-center gap-2 mb-2">
              <Tag :severity="getActionSeverity(card.action_type)" :icon="getActionIcon(card.action_type)">{{ getActionLabel(card.action_type) }}</Tag>
              <span class="text-sm text-muted-color">#{{ card.id }}</span>
            </div>
            <div class="text-sm text-muted-color">{{ formatDate(card.created_at) }}</div>
          </div>
          <div class="flex gap-2">
            <Button label="Одобрить" icon="pi pi-check" severity="success" size="small" @click="approveCard(card)" :loading="processingCardId === card.id" />
            <Button label="Отклонить" icon="pi pi-times" severity="danger" size="small" outlined @click="rejectCard(card)" :loading="processingCardId === card.id" />
          </div>
        </div>
        <div class="grid grid-cols-12 gap-4">
          <div class="col-span-12 md:col-span-6">
            <label class="block text-sm font-medium mb-1">Создатель</label>
            <div class="flex align-items-center gap-2">
              <i class="pi pi-user text-primary"></i>
              <span class="font-semibold">{{ card.creator_name }}</span>
              <Tag :value="card.creator_server" severity="info" class="text-xs" />
            </div>
          </div>
          <div class="col-span-12 md:col-span-6">
            <label class="block text-sm font-medium mb-1">Целевой администратор</label>
            <div class="flex align-items-center gap-2">
              <i class="pi pi-user-edit text-orange-500"></i>
              <span class="font-semibold">{{ card.target_admin_name }}</span>
            </div>
          </div>
          <div class="col-span-12">
            <label class="block text-sm font-medium mb-1">Причина</label>
            <p class="white-space-pre-wrap">{{ card.reason }}</p>
          </div>
          <div v-if="card.evidence" class="col-span-12">
            <label class="block text-sm font-medium mb-1">Доказательства</label>
            <p class="white-space-pre-wrap text-sm">{{ card.evidence }}</p>
          </div>
        </div>
      </div>
    </div>
    <div class="flex justify-end mt-4">
      <Button label="История карточек" icon="pi pi-history" severity="secondary" outlined @click="showHistory" />
    </div>
  </div>
  <Dialog v-model:visible="confirmBanDialogVisible" modal header="Подтверждение вечной блокировки" :style="{ width: '500px' }">
    <div class="confirmation-content">
      <i class="pi pi-exclamation-triangle" style="font-size: 3rem; color: var(--red-500)"></i>
      <p><strong>Вы уверены, что хотите применить вечную блокировку?</strong></p>
      <p>Это действие необратимо и заблокирует администратора навсегда.</p>
      <div v-if="selectedCard" class="mt-3">
        <p><strong>Администратор:</strong> {{ selectedCard.target_admin_name }}</p>
        <p><strong>Причина:</strong> {{ selectedCard.reason }}</p>
      </div>
    </div>
    <template #footer>
      <Button label="Отмена" icon="pi pi-times" @click="confirmBanDialogVisible = false" severity="secondary" />
      <Button label="Подтвердить блокировку" icon="pi pi-check" @click="confirmBan" severity="danger" :loading="confirmingBan" />
    </template>
  </Dialog>
  <Dialog v-model:visible="historyDialogVisible" modal header="История карточек" :style="{ width: '900px' }" :breakpoints="{ '960px': '90vw' }">
    <div v-if="loadingHistory" class="flex justify-center py-4"><ProgressSpinner /></div>
    <div v-else-if="historyCards.length === 0" class="text-center py-4 text-muted-color">История пуста</div>
    <div v-else class="history-list">
      <div v-for="card in historyCards" :key="card.id" class="history-item p-3 mb-3 border-round">
        <div class="flex justify-between align-items-start mb-2">
          <div class="flex align-items-center gap-2">
            <Tag :severity="card.status === 'approved' ? 'success' : 'danger'">{{ card.status === 'approved' ? 'Одобрено' : 'Отклонено' }}</Tag>
            <Tag :severity="getActionSeverity(card.action_type)" :icon="getActionIcon(card.action_type)">{{ getActionLabel(card.action_type) }}</Tag>
          </div>
          <span class="text-sm text-muted-color">{{ formatDate(card.reviewed_at) }}</span>
        </div>
        <div class="grid grid-cols-12 gap-2 text-sm">
          <div class="col-span-6"><strong>Создатель:</strong> {{ card.creator_name }}</div>
          <div class="col-span-6"><strong>Цель:</strong> {{ card.target_admin_name }}</div>
          <div class="col-span-12"><strong>Причина:</strong> {{ card.reason }}</div>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import api from '@/service/api';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';

const router = useRouter();
const toast = useToast();
const cards = ref([]);
const historyCards = ref([]);
const loading = ref(false);
const loadingHistory = ref(false);
const processingCardId = ref(null);
const confirmBanDialogVisible = ref(false);
const historyDialogVisible = ref(false);
const selectedCard = ref(null);
const confirmingBan = ref(false);
let pollInterval = null;
let previousCardCount = 0;
let notificationAudio = null;

const preloadNotificationSound = () => {
  try {
    notificationAudio = new Audio('https://zvukogram.com/mp3/43642.mp3');
    notificationAudio.volume = 0.5;
    notificationAudio.load();
  } catch (error) {
    console.error('Failed to preload notification sound:', error);
  }
};

const playNotificationSound = () => {
  try {
    if (notificationAudio) {
      notificationAudio.currentTime = 0;
      notificationAudio.play().catch(error => console.error('Failed to play notification sound:', error));
    }
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
};

const getActionLabel = (actionType) => {
  const labels = { warning_add: 'Выдача предупреждения', warning_remove: 'Снятие предупреждения', permanent_ban: 'Вечная блокировка' };
  return labels[actionType] || actionType;
};

const getActionSeverity = (actionType) => {
  const severities = { warning_add: 'warn', warning_remove: 'success', permanent_ban: 'danger' };
  return severities[actionType] || 'info';
};

const getActionIcon = (actionType) => {
  const icons = { warning_add: 'pi pi-exclamation-triangle', warning_remove: 'pi pi-check-circle', permanent_ban: 'pi pi-ban' };
  return icons[actionType] || 'pi pi-info-circle';
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const loadPendingCards = async (silent = false) => {
  if (!silent) loading.value = true;
  try {
    const response = await api.get('/admin/cards/pending');
    const newCards = response.data.cards;
    if (previousCardCount > 0 && newCards.length > previousCardCount) {
      playNotificationSound();
      toast.add({ severity: 'info', summary: 'Новая карточка', detail: `Появилась новая карточка в ожидании (всего: ${newCards.length})`, life: 5000 });
    }
    cards.value = newCards;
    previousCardCount = newCards.length;
  } catch (error) {
    console.error('Failed to load pending cards:', error);
    if (!silent) toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось загрузить карточки', life: 5000 });
  } finally {
    if (!silent) loading.value = false;
  }
};

const approveCard = async (card) => {
  processingCardId.value = card.id;
  try {
    const response = await api.post(`/admin/cards/${card.id}/review`, { action: 'approve' });
    if (response.data.requires_confirmation) {
      selectedCard.value = card;
      confirmBanDialogVisible.value = true;
    } else {
      toast.add({ severity: 'success', summary: 'Успешно', detail: 'Карточка одобрена и действие выполнено', life: 3000 });
      await loadPendingCards();
    }
  } catch (error) {
    console.error('Failed to approve card:', error);
    toast.add({ severity: 'error', summary: 'Ошибка', detail: error.response?.data?.error || 'Не удалось одобрить карточку', life: 5000 });
  } finally {
    processingCardId.value = null;
  }
};

const rejectCard = async (card) => {
  processingCardId.value = card.id;
  try {
    await api.post(`/admin/cards/${card.id}/review`, { action: 'reject' });
    toast.add({ severity: 'info', summary: 'Карточка отклонена', detail: 'Заявка была отклонена', life: 3000 });
    await loadPendingCards();
  } catch (error) {
    console.error('Failed to reject card:', error);
    toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось отклонить карточку', life: 5000 });
  } finally {
    processingCardId.value = null;
  }
};

const confirmBan = async () => {
  if (!selectedCard.value) return;
  confirmingBan.value = true;
  try {
    await api.post(`/admin/cards/${selectedCard.value.id}/confirm-ban`);
    toast.add({ severity: 'success', summary: 'Блокировка применена', detail: 'Вечная блокировка успешно применена', life: 3000 });
    confirmBanDialogVisible.value = false;
    selectedCard.value = null;
    await loadPendingCards();
  } catch (error) {
    console.error('Failed to confirm ban:', error);
    toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось применить блокировку', life: 5000 });
  } finally {
    confirmingBan.value = false;
  }
};

const showHistory = async () => {
  historyDialogVisible.value = true;
  loadingHistory.value = true;
  try {
    const response = await api.get('/admin/cards/history');
    historyCards.value = response.data.cards;
  } catch (error) {
    console.error('Failed to load history:', error);
    toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось загрузить историю', life: 5000 });
  } finally {
    loadingHistory.value = false;
  }
};

const goBack = () => router.push({ name: 'home' });

onMounted(() => {
  preloadNotificationSound();
  loadPendingCards();
  pollInterval = setInterval(() => loadPendingCards(true), 30000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<style scoped>
.text-muted-color { color: var(--text-color-secondary); }
.card-item { background: var(--surface-card); border: 1px solid var(--surface-border); }
.card-item:hover { border-color: var(--primary-color); }
.history-item { background: var(--surface-ground); border: 1px solid var(--surface-border); }
.confirmation-content { display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; padding: 1rem; }
.confirmation-content p { margin: 0; }
</style>
