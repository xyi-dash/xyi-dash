<template>
  <div class="card">
    <div class="flex items-center gap-2 mb-6">
      <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
      <div class="font-semibold text-xl">История карточек</div>
    </div>

    <div class="text-muted-color mb-6">
      Просмотр всех обработанных карточек с фильтрацией и сортировкой
    </div>

    <!-- Filters -->
    <div class="filters-container p-4 mb-4 surface-ground border-round">
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 md:col-span-3">
          <label class="block text-sm font-medium mb-2">Статус</label>
          <Dropdown
            v-model="filters.status"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            placeholder="Все статусы"
          />
        </div>

        <div class="col-span-12 md:col-span-3">
          <label class="block text-sm font-medium mb-2">Тип действия</label>
          <Dropdown
            v-model="filters.action_type"
            :options="actionTypeOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            placeholder="Все действия"
          />
        </div>

        <div class="col-span-12 md:col-span-3">
          <label class="block text-sm font-medium mb-2">Поиск по цели</label>
          <InputText
            v-model="filters.target_name"
            class="w-full"
            placeholder="Никнейм администратора/игрока"
          />
        </div>

        <div class="col-span-12 md:col-span-3">
          <label class="block text-sm font-medium mb-2">Сортировка</label>
          <Dropdown
            v-model="sortOrder"
            :options="sortOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>

        <div class="col-span-12">
          <div class="flex gap-2">
            <Button label="Применить" icon="pi pi-filter" @click="applyFilters" />
            <Button label="Сбросить" icon="pi pi-filter-slash" severity="secondary" outlined @click="resetFilters" />
          </div>
        </div>
      </div>
    </div>

    <!-- History List -->
    <div v-if="loading" class="flex justify-center py-8">
      <ProgressSpinner />
    </div>

    <div v-else-if="historyCards.length === 0" class="text-center py-8 text-muted-color">
      Нет карточек в истории
    </div>

    <div v-else class="history-list">
      <div v-for="card in historyCards" :key="card.id" class="history-item p-4 mb-3 border-round">
        <div class="flex justify-between align-items-start mb-3">
          <div class="flex align-items-center gap-2">
            <Tag :severity="card.status === 'approved' ? 'success' : 'danger'">
              {{ card.status === 'approved' ? 'Одобрено' : 'Отклонено' }}
            </Tag>
            <Tag :severity="getActionSeverity(card.action_type)" :icon="getActionIcon(card.action_type)">
              {{ getActionLabel(card.action_type) }}
            </Tag>
            <span class="text-sm text-muted-color">#{{ card.id }}</span>
          </div>
          <div class="text-sm text-muted-color">
            {{ formatDate(card.reviewed_at) }}
          </div>
        </div>

        <div class="grid grid-cols-12 gap-3 text-sm">
          <div class="col-span-12 md:col-span-6">
            <label class="block text-xs font-medium mb-1 text-muted-color">Создатель</label>
            <div class="flex align-items-center gap-2">
              <i class="pi pi-user text-primary"></i>
              <span class="font-semibold">{{ card.creator_name }}</span>
              <Tag :value="card.creator_server" severity="info" class="text-xs" />
            </div>
          </div>

          <div class="col-span-12 md:col-span-6">
            <label class="block text-xs font-medium mb-1 text-muted-color">
              {{ card.action_type === 'permanent_ban' ? 'Целевой игрок' : 'Целевой администратор' }}
            </label>
            <div class="flex align-items-center gap-2">
              <i class="pi pi-user-edit" :class="card.action_type === 'permanent_ban' ? 'text-red-500' : 'text-orange-500'"></i>
              <span class="font-semibold">{{ card.target_admin_name }}</span>
            </div>
          </div>

          <div class="col-span-12">
            <label class="block text-xs font-medium mb-1 text-muted-color">Причина</label>
            <p class="white-space-pre-wrap m-0">{{ card.reason }}</p>
          </div>

          <div v-if="card.evidence" class="col-span-12">
            <label class="block text-xs font-medium mb-1 text-muted-color">Доказательства</label>
            <p class="white-space-pre-wrap text-sm m-0">{{ card.evidence }}</p>
          </div>

          <div class="col-span-12 md:col-span-6">
            <label class="block text-xs font-medium mb-1 text-muted-color">Дата создания</label>
            <span>{{ formatDate(card.created_at) }}</span>
          </div>

          <div class="col-span-12 md:col-span-6">
            <label class="block text-xs font-medium mb-1 text-muted-color">Дата рассмотрения</label>
            <span>{{ formatDate(card.reviewed_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <Paginator
      v-if="pagination.total > 0"
      :rows="pagination.per_page"
      :totalRecords="pagination.total"
      :first="(pagination.current_page - 1) * pagination.per_page"
      @page="onPageChange"
      class="mt-4"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import api from '@/service/api';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import Paginator from 'primevue/paginator';

const router = useRouter();
const toast = useToast();

const historyCards = ref([]);
const loading = ref(false);

const filters = ref({
  status: null,
  action_type: null,
  target_name: '',
});

const sortOrder = ref('desc');

const pagination = ref({
  current_page: 1,
  per_page: 20,
  total: 0,
  last_page: 1,
});

const statusOptions = [
  { label: 'Все статусы', value: null },
  { label: 'Одобрено', value: 'approved' },
  { label: 'Отклонено', value: 'rejected' },
];

const actionTypeOptions = [
  { label: 'Все действия', value: null },
  { label: 'Выдача предупреждения', value: 'warning_add' },
  { label: 'Снятие предупреждения', value: 'warning_remove' },
  { label: 'Повышение уровня', value: 'level_up' },
  { label: 'Понижение уровня', value: 'level_down' },
  { label: 'Вечная блокировка', value: 'permanent_ban' },
];

const sortOptions = [
  { label: 'Сначала новые', value: 'desc' },
  { label: 'Сначала старые', value: 'asc' },
];

const getActionLabel = (actionType) => {
  const labels = {
    warning_add: 'Выдача предупреждения',
    warning_remove: 'Снятие предупреждения',
    level_up: 'Повышение уровня',
    level_down: 'Понижение уровня',
    permanent_ban: 'Вечная блокировка',
  };
  return labels[actionType] || actionType;
};

const getActionSeverity = (actionType) => {
  const severities = {
    warning_add: 'warn',
    warning_remove: 'success',
    level_up: 'success',
    level_down: 'warn',
    permanent_ban: 'danger',
  };
  return severities[actionType] || 'info';
};

const getActionIcon = (actionType) => {
  const icons = {
    warning_add: 'pi pi-exclamation-triangle',
    warning_remove: 'pi pi-check-circle',
    level_up: 'pi pi-arrow-up',
    level_down: 'pi pi-arrow-down',
    permanent_ban: 'pi pi-ban',
  };
  return icons[actionType] || 'pi pi-info-circle';
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const loadHistory = async (page = 1) => {
  loading.value = true;
  try {
    const params = {
      page,
      per_page: pagination.value.per_page,
      sort: sortOrder.value,
    };

    if (filters.value.status) {
      params.status = filters.value.status;
    }

    if (filters.value.action_type) {
      params.action_type = filters.value.action_type;
    }

    if (filters.value.target_name.trim()) {
      params.target_name = filters.value.target_name.trim();
    }

    const response = await api.get('/admin/cards/history', { params });

    historyCards.value = response.data.cards;
    pagination.value = response.data.pagination;
  } catch (error) {
    console.error('Failed to load history:', error);
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось загрузить историю карточек',
      life: 5000,
    });
  } finally {
    loading.value = false;
  }
};

const applyFilters = () => {
  loadHistory(1);
};

const resetFilters = () => {
  filters.value = {
    status: null,
    action_type: null,
    target_name: '',
  };
  sortOrder.value = 'desc';
  loadHistory(1);
};

const onPageChange = (event) => {
  const page = event.page + 1;
  loadHistory(page);
};

const goBack = () => router.push({ name: 'extended-pending-cards' });

onMounted(() => {
  loadHistory();
});
</script>

<style scoped>
.text-muted-color {
  color: var(--text-color-secondary);
}

.filters-container {
  background: var(--surface-ground);
}

.history-item {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
}

.history-item:hover {
  border-color: var(--primary-color);
}
</style>
