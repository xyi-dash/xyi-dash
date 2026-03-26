<script setup>
import api from '@/service/api';
import { useAuthStore } from '@/stores/auth';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

const loading = ref(false);
const formData = ref({
    nickname: '',
    account_id: null,
    server: authStore.currentServer || 'one',
    reason: '',
    reg_ip: '',
    last_ip: '',
    last_hash: '',
    vk_link: '',
    forum_account: '',
    discord_login: '',
    screenshot: '',
    proofs: ''
});

const serverOptions = [
    { label: 'Server 01', value: 'one' },
    { label: 'Server 02', value: 'two' },
    { label: 'Server 03', value: 'three' }
];

async function submitBlacklist() {
    if (!formData.value.nickname || !formData.value.account_id || !formData.value.reason) {
        toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Заполните обязательные поля', life: 3000 });
        return;
    }

    loading.value = true;
    try {
        const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : '';
        await api.post(`/admin/blacklist${serverParam}`, formData.value);
        
        toast.add({ 
            severity: 'success', 
            summary: 'Успешно', 
            detail: 'Запись добавлена в черный список на форуме', 
            life: 5000 
        });

        // Очистить форму
        formData.value = {
            nickname: '',
            account_id: null,
            server: authStore.currentServer || 'one',
            reason: '',
            reg_ip: '',
            last_ip: '',
            last_hash: '',
            vk_link: '',
            forum_account: '',
            discord_login: '',
            screenshot: '',
            proofs: ''
        };
    } catch (error) {
        console.error('blacklist submission failed', error);
        toast.add({ 
            severity: 'error', 
            summary: 'Ошибка', 
            detail: error.response?.data?.error || 'Не удалось добавить запись', 
            life: 3000 
        });
    } finally {
        loading.value = false;
    }
}

const goBack = () => router.push({ name: 'home' });
</script>

<template>
    <div class="card">
        <div class="flex items-center gap-2 mb-6">
            <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
            <div class="font-semibold text-xl">Внесение в черный список</div>
        </div>

        <div class="text-muted-color mb-6">
            Заполните форму для автоматического добавления записи в черный список на форуме
        </div>

        <div class="grid grid-cols-12 gap-6">
            <div class="col-span-12 md:col-span-6">
                <label class="block text-sm font-medium mb-2">
                    Никнейм <span class="text-red-500">*</span>
                </label>
                <InputText v-model="formData.nickname" class="w-full" placeholder="Введите никнейм" />
            </div>

            <div class="col-span-12 md:col-span-6">
                <label class="block text-sm font-medium mb-2">
                    Номер аккаунта <span class="text-red-500">*</span>
                </label>
                <InputNumber v-model="formData.account_id" class="w-full" :min="1" placeholder="ID аккаунта" />
            </div>

            <div class="col-span-12 md:col-span-6">
                <label class="block text-sm font-medium mb-2">
                    Сервер <span class="text-red-500">*</span>
                </label>
                <Dropdown v-model="formData.server" :options="serverOptions" optionLabel="label" optionValue="value" class="w-full" />
            </div>

            <div class="col-span-12">
                <label class="block text-sm font-medium mb-2">
                    Причина занесения <span class="text-red-500">*</span>
                </label>
                <Textarea v-model="formData.reason" class="w-full" rows="3" placeholder="Опишите причину занесения в ЧС" />
            </div>

            <div class="col-span-12 md:col-span-6">
                <label class="block text-sm font-medium mb-2">REG IP</label>
                <InputText v-model="formData.reg_ip" class="w-full" placeholder="192.168.0.1" />
            </div>

            <div class="col-span-12 md:col-span-6">
                <label class="block text-sm font-medium mb-2">LAST IP</label>
                <InputText v-model="formData.last_ip" class="w-full" placeholder="192.168.1.100" />
            </div>

            <div class="col-span-12 md:col-span-6">
                <label class="block text-sm font-medium mb-2">REG | LAST HASH</label>
                <InputText v-model="formData.last_hash" class="w-full" placeholder="ABCDEF123456789..." />
            </div>

            <div class="col-span-12 md:col-span-6">
                <label class="block text-sm font-medium mb-2">Ссылка на VK</label>
                <InputText v-model="formData.vk_link" class="w-full" placeholder="https://vk.com/id..." />
            </div>

            <div class="col-span-12 md:col-span-6">
                <label class="block text-sm font-medium mb-2">Форумный аккаунт</label>
                <InputText v-model="formData.forum_account" class="w-full" placeholder="Никнейм на форуме" />
            </div>

            <div class="col-span-12 md:col-span-6">
                <label class="block text-sm font-medium mb-2">Логин Discord</label>
                <InputText v-model="formData.discord_login" class="w-full" placeholder="username#1234" />
            </div>

            <div class="col-span-12 md:col-span-6">
                <label class="block text-sm font-medium mb-2">Скриншот статистики</label>
                <InputText v-model="formData.screenshot" class="w-full" placeholder="https://..." />
            </div>

            <div class="col-span-12">
                <label class="block text-sm font-medium mb-2">Доказательства</label>
                <Textarea v-model="formData.proofs" class="w-full" rows="2" placeholder="Ссылки на доказательства или описание" />
            </div>

            <div class="col-span-12">
                <div class="flex justify-end gap-2">
                    <Button label="Отмена" severity="secondary" @click="goBack" :disabled="loading" />
                    <Button label="Отправить" icon="pi pi-send" @click="submitBlacklist" :loading="loading" />
                </div>
            </div>
        </div>
    </div>
</template>
