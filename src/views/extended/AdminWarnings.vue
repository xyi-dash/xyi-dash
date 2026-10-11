<template>
  <div class="flex flex-col gap-6">
    <div class="card">
      <div class="flex items-center gap-3 mb-2">
        <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
        <div class="font-semibold text-xl">{{ L.title }}</div>
      </div>
      <div class="text-muted-color">{{ L.subtitle }}</div>
    </div>

    <div class="card">
      <div class="grid grid-cols-12 gap-5">
        <div class="col-span-12 md:col-span-4">
          <label class="block text-sm mb-2">{{ L.target }}</label>
          <InputText v-model="form.target_name" class="w-full" :placeholder="L.targetPlaceholder" maxlength="32" />
        </div>
        <div class="col-span-12 md:col-span-4">
          <label class="block text-sm mb-2">{{ L.type }}</label>
          <Select v-model="form.card_type" :options="types" optionLabel="label" optionValue="value" class="w-full" :placeholder="L.typePlaceholder" />
        </div>
        <div v-if="form.card_type === 'admin_rename'" class="col-span-12 md:col-span-4">
          <label class="block text-sm mb-2">{{ L.newNick }}</label>
          <InputText v-model="form.new_nickname" class="w-full" maxlength="32" />
        </div>
        <div v-if="form.card_type === 'admin_donate'" class="col-span-12 md:col-span-4">
          <label class="block text-sm mb-2">{{ L.donate }}</label>
          <InputNumber v-model="form.donate_amount" class="w-full" :min="0" :useGrouping="false" />
        </div>
        <div class="col-span-12">
          <label class="block text-sm mb-2">{{ L.reason }}</label>
          <Textarea v-model="form.reason" class="w-full" rows="5" autoResize maxlength="2000" :placeholder="L.reasonPlaceholder" />
        </div>
        <div class="col-span-12">
          <label class="block text-sm mb-2">{{ L.evidence }}</label>
          <Textarea v-model="form.evidence" class="w-full" rows="3" autoResize maxlength="4000" :placeholder="L.evidencePlaceholder" />
        </div>
        <div class="col-span-12 flex justify-end gap-2">
          <Button :label="L.clear" severity="secondary" outlined @click="resetForm" />
          <Button :label="L.submit" icon="pi pi-send" :loading="loading" :disabled="!valid" @click="submit" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import api from '@/service/api';
import { useAuthStore } from '@/stores/auth';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();
const L = {
  title: '\u0417\u0430\u0434\u0430\u0447\u0430 \u043f\u043e \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0443', subtitle: '\u0421\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0443 \u0434\u043b\u044f \u0440\u0443\u043a\u043e\u0432\u043e\u0434\u0441\u0442\u0432\u0430: \u043f\u0440\u0435\u0434, \u0441\u043d\u044f\u0442\u0438\u0435 \u043f\u0440\u0435\u0434\u0430, \u043d\u0438\u043a, \u0443\u0440\u043e\u0432\u0435\u043d\u044c \u0438\u043b\u0438 \u0434\u043e\u043d\u0430\u0442.',
  target: '\u041d\u0438\u043a \u0430\u0434\u043c\u0438\u043d\u0430', targetPlaceholder: '\u041d\u0430\u043f\u0440. yovimi.uchiha', type: '\u0422\u0438\u043f \u0437\u0430\u0434\u0430\u0447\u0438', typePlaceholder: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u0438\u043f', newNick: '\u041d\u043e\u0432\u044b\u0439 \u043d\u0438\u043a', donate: '\u0421\u0443\u043c\u043c\u0430 \u0434\u043e\u043d\u0430\u0442\u0430', reason: '\u041f\u0440\u0438\u0447\u0438\u043d\u0430', reasonPlaceholder: '\u0427\u0442\u043e \u043d\u0443\u0436\u043d\u043e \u0441\u0434\u0435\u043b\u0430\u0442\u044c \u0438 \u043f\u043e\u0447\u0435\u043c\u0443', evidence: '\u0414\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430', evidencePlaceholder: '\u0421\u0441\u044b\u043b\u043a\u0438, \u043b\u043e\u0433\u0438, \u043f\u043e\u044f\u0441\u043d\u0435\u043d\u0438\u044f', submit: '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0443', clear: '\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c', ok: '\u041a\u0430\u0440\u0442\u043e\u0447\u043a\u0430 \u0441\u043e\u0437\u0434\u0430\u043d\u0430', fail: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0443'
};
const types = [
  { label: '\u0412\u044b\u0434\u0430\u0442\u044c \u043f\u0440\u0435\u0434', value: 'admin_warn' },
  { label: '\u0421\u043d\u044f\u0442\u044c \u043f\u0440\u0435\u0434', value: 'admin_unwarn' },
  { label: '\u041f\u043e\u0432\u044b\u0441\u0438\u0442\u044c', value: 'admin_promote' },
  { label: '\u041f\u043e\u043d\u0438\u0437\u0438\u0442\u044c', value: 'admin_demote' },
  { label: '\u041f\u043e\u043c\u0435\u043d\u044f\u0442\u044c \u043d\u0438\u043a', value: 'admin_rename' },
  { label: '\u0412\u044b\u0434\u0430\u043d \u0434\u043e\u043d\u0430\u0442', value: 'admin_donate' }
];
const loading = ref(false);
const form = ref({ card_type: '', target_name: '', reason: '', evidence: '', new_nickname: '', donate_amount: 0 });
const valid = computed(() => form.value.card_type && form.value.target_name.trim() && form.value.reason.trim() && (form.value.card_type !== 'admin_rename' || form.value.new_nickname.trim()));
function resetForm() { form.value = { card_type: '', target_name: '', reason: '', evidence: '', new_nickname: '', donate_amount: 0 }; }
async function submit() { loading.value = true; try { await api.post(`/admin/cards${authStore.currentServer ? `?server=${authStore.currentServer}` : ''}`, form.value); toast.add({ severity: 'success', summary: 'OK', detail: L.ok, life: 3000 }); resetForm(); } catch { toast.add({ severity: 'error', summary: 'Error', detail: L.fail, life: 5000 }); } finally { loading.value = false; } }
function goBack() { router.push({ name: 'home' }); }
</script>
