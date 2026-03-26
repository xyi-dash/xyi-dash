<template>
  <div class="card">
    <div class="flex items-center gap-2 mb-6">
      <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
      <div class="font-semibold text-xl">Создание карточки</div>
    </div>

    <div class="text-muted-color mb-6">
      Создание заявки на действие с администратором
    </div>

    <div class="grid grid-cols-12 gap-6">
      <div class="col-span-12 md:col-span-6">
        <label class="block text-sm font-medium mb-2">
          Никнейм администратора <span class="text-red-500">*</span>
        </label>
        <InputText
          v-model="formData.target_admin_name"
          class="w-full"
          :class="{ 'p-invalid': errors.target_admin_name }"
          placeholder="Введите никнейм администратора"
          maxlength="24"
        />
        <small v-if="errors.target_admin_name" class="p-error block mt-1">{{ errors.target_admin_name }}</small>
      </div>

      <div class="col-span-12 md:col-span-6">
        <label class="block text-sm font-medium mb-2">
          Тип действия <span class="text-red-500">*</span>
        </label>
        <Dropdown
          v-model="formData.action_type"
          :options="actionOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
          :class="{ 'p-invalid': errors.action_type }"
          placeholder="Выберите действие"
        />
        <small v-if="errors.action_type" class="p-error block mt-1">{{ errors.action_type }}</small>
      </div>

      <div class="col-span-12">
        <label class="block text-sm font-medium mb-2">
          Причина <span class="text-red-500">*</span>
        </label>
        <Textarea
          v-model="formData.reason"
          class="w-full"
          :class="{ 'p-invalid': errors.reason }"
          rows="5"
          placeholder="Опишите причину создания карточки"
          maxlength="1000"
          :autoResize="true"
        />
        <div class="flex justify-content-between align-items-center mt-1">
          <small v-if="errors.reason" class="p-error">{{ errors.reason }}</small>
          <small class="text-muted-color ml-auto">{{ formData.reason.length }} / 1000</small>
        </div>
      </div>

      <div class="col-span-12">
        <label class="block text-sm font-medium mb-2">Доказательства</label>
        <Textarea
          v-model="formData.evidence"
          class="w-full"
          rows="4"
          placeholder="Ссылки на скриншоты, логи, видео и другие доказательства"
          maxlength="2000"
          :autoResize="true"
        />
        <small class="text-muted-color block mt-1">{{ formData.evidence.length }} / 2000</small>
      </div>

      <div class="col-span-12">
        <div class="flex justify-end gap-2">
          <Button label="Отмена" severity="secondary" @click="goBack" :disabled="loading" />
          <Button
            label="Создать карточку"
            icon="pi pi-send"
            @click="submitCard"
            :loading="loading"
            :disabled="!isFormValid"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import api from '@/service/api';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';

const router = useRouter();
const toast = useToast();

const formData = ref({
  target_admin_name: '',
  action_type: '',
  reason: '',
  evidence: '',
});

const errors = ref({
  target_admin_name: '',
  action_type: '',
  reason: '',
});

const loading = ref(false);

const actionOptions = [
  { label: 'Выдача предупреждения', value: 'warning_add' },
  { label: 'Снятие предупреждения', value: 'warning_remove' },
  { label: 'Выдача вечной блокировки', value: 'permanent_ban' },
];

const isFormValid = computed(() => {
  return (
    formData.value.target_admin_name.trim().length > 0 &&
    formData.value.action_type !== '' &&
    formData.value.reason.trim().length > 0
  );
});

const validateForm = () => {
  errors.value = {
    target_admin_name: '',
    action_type: '',
    reason: '',
  };

  let isValid = true;

  if (!formData.value.target_admin_name.trim()) {
    errors.value.target_admin_name = 'Укажите никнейм администратора';
    isValid = false;
  }

  if (!formData.value.action_type) {
    errors.value.action_type = 'Выберите тип действия';
    isValid = false;
  }

  if (!formData.value.reason.trim()) {
    errors.value.reason = 'Укажите причину';
    isValid = false;
  }

  return isValid;
};

const submitCard = async () => {
  if (!validateForm()) {
    return;
  }

  loading.value = true;

  try {
    const response = await api.post('/admin/cards', formData.value);

    toast.add({
      severity: 'success',
      summary: 'Успешно',
      detail: 'Карточка создана и отправлена на рассмотрение',
      life: 3000,
    });

    resetForm();
  } catch (error) {
    console.error('Failed to create card:', error);

    if (error.response?.data?.errors) {
      // Validation errors
      const serverErrors = error.response.data.errors;
      Object.keys(serverErrors).forEach((key) => {
        if (errors.value.hasOwnProperty(key)) {
          errors.value[key] = serverErrors[key][0];
        }
      });
    } else if (error.response?.data?.error) {
      toast.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: error.response.data.error === 'insufficient_level'
          ? 'Недостаточно прав для создания карточек'
          : 'Не удалось создать карточку',
        life: 5000,
      });
    } else {
      toast.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: 'Не удалось создать карточку',
        life: 5000,
      });
    }
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  formData.value = {
    target_admin_name: '',
    action_type: '',
    reason: '',
    evidence: '',
  };
  errors.value = {
    target_admin_name: '',
    action_type: '',
    reason: '',
  };
};

const goBack = () => router.push({ name: 'home' });
</script>

<style scoped>
.p-error {
  color: #e24c4c;
  font-size: 0.875rem;
}

.text-muted-color {
  color: var(--text-color-secondary);
}
</style>
