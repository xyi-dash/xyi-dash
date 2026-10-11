<script setup>
import api from '@/service/api';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

const authStore = useAuthStore();
const toast = useToast();

const loading = ref(false);
const saving = ref(false);
const form = ref({ enabled: false, reason: '', minutes: null, luck_wheel_test_mode: false });
const status = ref(null);

const remainingLabel = computed(() => {
    const seconds = status.value?.remaining_seconds || 0;
    if (!seconds) return '-';
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `${minutes} \u043c\u0438\u043d.`;
});

const labels = {
    title: '\u0422\u0435\u0445\u0440\u0430\u0431\u043e\u0442\u044b',
    subtitle: '\u0417\u0430\u043a\u0440\u044b\u0432\u0430\u0435\u0442 \u0432\u0445\u043e\u0434 \u0432 \u0430\u0434\u043c\u0438\u043d\u043a\u0443 \u0434\u043b\u044f \u0432\u0441\u0435\u0445, \u043a\u0440\u043e\u043c\u0435 Exfil_Chidori.',
    enabled: '\u0412\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u0440\u0435\u0436\u0438\u043c',
    reason: '\u041f\u0440\u0438\u0447\u0438\u043d\u0430',
    reasonPlaceholder: '\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: \u041e\u0431\u043d\u043e\u0432\u043b\u044f\u0435\u043c \u0441\u0438\u0441\u0442\u0435\u043c\u0443 \u0438 \u0447\u0438\u043d\u0438\u043c \u043f\u0430\u0440\u0443 \u043c\u0435\u0441\u0442.',
    minutes: '\u0422\u0430\u0439\u043c\u0435\u0440, \u043c\u0438\u043d\u0443\u0442',
    minutesHelp: '\u041e\u0441\u0442\u0430\u0432\u044c \u043f\u0443\u0441\u0442\u044b\u043c, \u0435\u0441\u043b\u0438 \u0442\u0430\u0439\u043c\u0435\u0440 \u043d\u0435 \u043d\u0443\u0436\u0435\u043d.',
    save: '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c',
    status: '\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u0441\u0442\u0430\u0442\u0443\u0441',
    active: '\u0410\u043a\u0442\u0438\u0432\u0435\u043d',
    inactive: '\u0412\u044b\u043a\u043b\u044e\u0447\u0435\u043d',
    remaining: '\u041e\u0441\u0442\u0430\u043b\u043e\u0441\u044c',
    updatedBy: '\u0418\u0437\u043c\u0435\u043d\u0438\u043b',
    wheelTest: 'Тестовый режим колеса удачи',
    wheelTestHelp: 'Когда включено, администраторы 1-6 уровня могут крутить колесо без пятничного ограничения.',
    success: '\u0420\u0435\u0436\u0438\u043c \u0442\u0435\u0445\u0440\u0430\u0431\u043e\u0442 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d.',
    error: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c.'
};

onMounted(loadData);

function fillForm(data) {
    status.value = data.maintenance;
    form.value.enabled = !!data.maintenance?.enabled;
    form.value.reason = data.maintenance?.reason || '';
    form.value.minutes = data.maintenance?.remaining_minutes || null;
    form.value.luck_wheel_test_mode = !!data.maintenance?.luck_wheel_test_mode;
}

async function loadData() {
    loading.value = true;
    try {
        const { data } = await api.get('/admin/maintenance');
        fillForm(data);
        authStore.maintenance = data.maintenance || null;
        authStore.isOwner = !!data.is_owner;
    } finally {
        loading.value = false;
    }
}

async function save() {
    saving.value = true;
    try {
        const minutes = form.value.minutes === '' || form.value.minutes === null ? null : Number(form.value.minutes);
        const { data } = await api.put('/admin/maintenance', {
            enabled: !!form.value.enabled,
            reason: form.value.reason,
            minutes: Number.isFinite(minutes) ? minutes : null,
            luck_wheel_test_mode: !!form.value.luck_wheel_test_mode
        });
        fillForm(data);
        authStore.maintenance = data.maintenance || null;
        authStore.isOwner = !!data.is_owner;
        toast.add({ severity: 'success', summary: 'OK', detail: labels.success, life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: '\u041e\u0448\u0438\u0431\u043a\u0430', detail: error.response?.data?.message || labels.error, life: 4000 });
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="card">
            <div class="flex items-start gap-3">
                <i class="pi pi-lock text-primary text-2xl mt-1"></i>
                <div>
                    <h2 class="text-xl font-semibold m-0">{{ labels.title }}</h2>
                    <p class="text-muted-color m-0 mt-1">{{ labels.subtitle }}</p>
                </div>
            </div>
        </div>

        <ProgressSpinner v-if="loading" class="flex justify-center py-8" />
        <div v-else class="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div class="card xl:col-span-2">
                <div class="flex items-center justify-between gap-4 mb-5">
                    <h3 class="text-lg font-semibold m-0">{{ labels.enabled }}</h3>
                    <InputSwitch v-model="form.enabled" />
                </div>

                <div class="flex flex-col gap-2 mb-4">
                    <label class="text-sm text-muted-color">{{ labels.reason }}</label>
                    <textarea v-model="form.reason" class="p-inputtext p-component w-full" rows="5" :placeholder="labels.reasonPlaceholder"></textarea>
                </div>

                <div class="flex flex-col gap-2 mb-5">
                    <label class="text-sm text-muted-color">{{ labels.minutes }}</label>
                    <InputText v-model="form.minutes" type="number" min="0" max="10080" class="w-full" />
                    <small class="text-muted-color">{{ labels.minutesHelp }}</small>
                </div>

                <div class="flex items-center justify-between gap-4 mb-5 p-4 rounded-lg border border-surface-200 dark:border-surface-700">
                    <div>
                        <div class="font-semibold">{{ labels.wheelTest }}</div>
                        <small class="text-muted-color">{{ labels.wheelTestHelp }}</small>
                    </div>
                    <InputSwitch v-model="form.luck_wheel_test_mode" />
                </div>

                <Button :label="labels.save" icon="pi pi-check" :loading="saving" @click="save" />
            </div>

            <div class="card">
                <h3 class="text-lg font-semibold mt-0 mb-4">{{ labels.status }}</h3>
                <div class="flex flex-col gap-3">
                    <div class="flex justify-between border-b border-surface-200 dark:border-surface-700 pb-3">
                        <span class="text-muted-color">{{ labels.status }}</span>
                        <Tag :severity="status?.enabled ? 'danger' : 'success'" :value="status?.enabled ? labels.active : labels.inactive" />
                    </div>
                    <div class="flex justify-between border-b border-surface-200 dark:border-surface-700 pb-3">
                        <span class="text-muted-color">{{ labels.remaining }}</span>
                        <span class="font-semibold">{{ remainingLabel }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-muted-color">{{ labels.updatedBy }}</span>
                        <span class="font-semibold">{{ status?.updated_by || '-' }}</span>
                    </div>
                    <div class="flex justify-between border-t border-surface-200 dark:border-surface-700 pt-3">
                        <span class="text-muted-color">{{ labels.wheelTest }}</span>
                        <Tag :severity="status?.luck_wheel_test_mode ? 'warn' : 'secondary'" :value="status?.luck_wheel_test_mode ? 'Включен' : 'Выключен'" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
