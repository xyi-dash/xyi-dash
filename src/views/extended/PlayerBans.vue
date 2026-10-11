<template>
  <div class="flex flex-col gap-6">
    <div class="card">
      <div class="flex items-center gap-3 mb-2"><Button icon="pi pi-arrow-left" text rounded @click="goBack" /><div class="font-semibold text-xl">{{ L.title }}</div></div>
      <Message severity="warn" :closable="false">{{ L.warn }}</Message>
    </div>
    <div class="card grid grid-cols-12 gap-5">
      <div class="col-span-12 md:col-span-6"><label class="block text-sm mb-2">{{ L.nick }}</label><InputText v-model="form.target_name" class="w-full" maxlength="32" /></div>
      <div class="col-span-12"><label class="block text-sm mb-2">{{ L.reason }}</label><Textarea v-model="form.reason" class="w-full" rows="5" autoResize maxlength="2000" /></div>
      <div class="col-span-12"><label class="block text-sm mb-2">{{ L.evidence }}</label><Textarea v-model="form.evidence" class="w-full" rows="3" autoResize maxlength="4000" /></div>
      <div class="col-span-12 flex justify-end gap-2"><Button :label="L.clear" severity="secondary" outlined @click="resetForm" /><Button :label="L.submit" icon="pi pi-send" severity="danger" :loading="loading" :disabled="!valid" @click="submit" /></div>
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
import Textarea from 'primevue/textarea';
import Message from 'primevue/message';
const router = useRouter();
const authStore = useAuthStore(); const toast = useToast();
const L = { title: '\u041a\u0430\u0440\u0442\u043e\u0447\u043a\u0430 \u043d\u0430 \u0432\u0435\u0447\u043d\u0443\u044e \u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u043a\u0443', warn: '\u041d\u0430 \u044d\u0442\u043e\u043c \u044d\u0442\u0430\u043f\u0435 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0430 \u0442\u043e\u043b\u044c\u043a\u043e \u043e\u0434\u043e\u0431\u0440\u044f\u0435\u0442\u0441\u044f \u0438\u043b\u0438 \u043e\u0442\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442\u0441\u044f. \u0410\u0432\u0442\u043e\u0432\u044b\u0434\u0430\u0447\u0438 \u0432\u0435\u0447\u043d\u0438\u043a\u0430 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442.', nick: '\u041d\u0438\u043a \u0438\u0433\u0440\u043e\u043a\u0430', reason: '\u041f\u0440\u0438\u0447\u0438\u043d\u0430', evidence: '\u0414\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430', submit: '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0443', clear: '\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c', ok: '\u041a\u0430\u0440\u0442\u043e\u0447\u043a\u0430 \u0441\u043e\u0437\u0434\u0430\u043d\u0430', fail: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0443' };
const loading = ref(false); const form = ref({ card_type: 'player_permanent_ban', target_type: 'player', target_name: '', reason: '', evidence: '' });
const valid = computed(() => form.value.target_name.trim() && form.value.reason.trim());
function resetForm(){ form.value = { card_type: 'player_permanent_ban', target_type: 'player', target_name: '', reason: '', evidence: '' }; }
async function submit(){ loading.value=true; try{ await api.post(`/admin/cards${authStore.currentServer ? `?server=${authStore.currentServer}` : ''}`, form.value); toast.add({severity:'success', summary:'OK', detail:L.ok, life:3000}); resetForm(); } catch { toast.add({severity:'error', summary:'Error', detail:L.fail, life:5000}); } finally{ loading.value=false; } }
function goBack(){ router.push({ name:'home' }); }
</script>
