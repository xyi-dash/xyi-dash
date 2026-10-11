<template>
  <div class="flex flex-col gap-6" @click="armSound">
    <div class="card flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div><div class="font-semibold text-xl">{{ L.title }}</div><div class="text-muted-color mt-1">{{ L.subtitle }}</div></div>
      <div class="flex gap-2"><Button :label="L.refresh" icon="pi pi-refresh" severity="secondary" outlined :loading="loading" @click="loadCards" /><Button :label="L.history" icon="pi pi-history" severity="secondary" outlined @click="goHistory" /></div>
    </div>
    <div v-if="loading" class="card flex justify-center py-8"><ProgressSpinner /></div>
    <div v-else-if="!cards.length" class="card text-center py-10 text-muted-color">{{ L.empty }}</div>
    <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div v-for="card in cards" :key="card.id" class="card flex flex-col gap-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2"><Tag :value="typeLabel(card.card_type)" :severity="typeSeverity(card.card_type)" /><span class="text-muted-color">#{{ card.id }}</span></div>
          <span class="text-sm text-muted-color">{{ formatDate(card.created_at) }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div class="p-3 rounded bg-surface-100 dark:bg-surface-800">
            <div class="text-muted-color text-xs mb-1">{{ L.creator }}</div>
            <div class="font-semibold">{{ card.creator_name }}</div>
          </div>
          <div class="p-3 rounded bg-surface-100 dark:bg-surface-800">
            <div class="text-muted-color text-xs mb-1">{{ targetLabel(card) }}</div>
            <div class="font-semibold text-primary">{{ card.target_name }}</div>
          </div>
        </div>
        <div v-if="hasDetail(card)" class="p-3 rounded bg-surface-100 dark:bg-surface-800 text-sm">
          <div v-if="card.card_type === 'admin_rename'" class="flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="flex-1">
              <div class="text-muted-color text-xs mb-1">{{ L.currentNick }}</div>
              <div class="font-semibold">{{ card.target_name }}</div>
            </div>
            <i class="pi pi-arrow-right text-primary hidden sm:block"></i>
            <i class="pi pi-arrow-down text-primary sm:hidden"></i>
            <div class="flex-1">
              <div class="text-muted-color text-xs mb-1">{{ L.newNick }}</div>
              <div class="font-semibold text-primary">{{ card.payload?.new_nickname || '-' }}</div>
            </div>
          </div>
          <div v-else-if="card.card_type === 'admin_donate'" class="flex items-center justify-between gap-3">
            <div>
              <div class="text-muted-color text-xs mb-1">{{ L.donate }}</div>
              <div class="font-semibold text-primary">{{ card.payload?.donate_amount || 0 }}</div>
            </div>
            <i class="pi pi-gift text-primary text-xl"></i>
          </div>
        </div>
        <div><div class="text-muted-color text-sm mb-1">{{ L.reason }}</div><div class="white-space-pre-wrap">{{ card.reason }}</div></div>
        <div v-if="card.evidence"><div class="text-muted-color text-sm mb-1">{{ L.evidence }}</div><div class="white-space-pre-wrap text-sm">{{ card.evidence }}</div></div>
        <Textarea v-model="comments[card.id]" rows="2" autoResize :placeholder="L.comment" />
        <div class="flex justify-end gap-2"><Button :label="L.reject" icon="pi pi-times" severity="danger" outlined :loading="processing===card.id" @click="review(card,'reject')" /><Button :label="L.approve" icon="pi pi-check" severity="success" :loading="processing===card.id" @click="review(card,'approve')" /></div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import api from '@/service/api';
import { useAuthStore } from '@/stores/auth';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import ProgressSpinner from 'primevue/progressspinner';
const router=useRouter(); const toast=useToast(); const authStore=useAuthStore();
const L={title:'\u041a\u0430\u0440\u0442\u043e\u0447\u043a\u0438 \u0432 \u043e\u0436\u0438\u0434\u0430\u043d\u0438\u0438',subtitle:'\u041e\u0434\u043e\u0431\u0440\u0435\u043d\u0438\u0435 \u0438\u043b\u0438 \u043e\u0442\u043a\u0430\u0437 \u0437\u0430\u044f\u0432\u043e\u043a. \u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u043f\u043e\u043a\u0430 \u043d\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u044f\u044e\u0442\u0441\u044f.',refresh:'\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c',history:'\u0418\u0441\u0442\u043e\u0440\u0438\u044f',empty:'\u041d\u0435\u0442 \u043a\u0430\u0440\u0442\u043e\u0447\u0435\u043a \u0432 \u043e\u0436\u0438\u0434\u0430\u043d\u0438\u0438',creator:'\u0421\u043e\u0437\u0434\u0430\u043b',target:'\u0426\u0435\u043b\u044c',admin:'\u0410\u0434\u043c\u0438\u043d',player:'\u0418\u0433\u0440\u043e\u043a',reason:'\u041f\u0440\u0438\u0447\u0438\u043d\u0430',evidence:'\u0414\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430',comment:'\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 \u0440\u0443\u043a\u043e\u0432\u043e\u0434\u0441\u0442\u0432\u0430',approve:'\u041e\u0434\u043e\u0431\u0440\u0438\u0442\u044c',reject:'\u041e\u0442\u043a\u0430\u0437\u0430\u0442\u044c',newCard:'\u041d\u043e\u0432\u0430\u044f \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0430',done:'\u0413\u043e\u0442\u043e\u0432\u043e',fail:'\u041e\u0448\u0438\u0431\u043a\u0430',currentNick:'\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u043d\u0438\u043a',newNick:'\u041d\u043e\u0432\u044b\u0439 \u043d\u0438\u043a',donate:'\u0414\u043e\u043d\u0430\u0442'};
const labels={admin_warn:'\u0412\u044b\u0434\u0430\u0442\u044c \u043f\u0440\u0435\u0434',admin_unwarn:'\u0421\u043d\u044f\u0442\u044c \u043f\u0440\u0435\u0434',admin_promote:'\u041f\u043e\u0432\u044b\u0441\u0438\u0442\u044c',admin_demote:'\u041f\u043e\u043d\u0438\u0437\u0438\u0442\u044c',admin_rename:'\u041f\u043e\u043c\u0435\u043d\u044f\u0442\u044c \u043d\u0438\u043a',admin_donate:'\u0412\u044b\u0434\u0430\u043d \u0434\u043e\u043d\u0430\u0442',player_permanent_ban:'\u0412\u0435\u0447\u043d\u0430\u044f \u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u043a\u0430'};
const cards=ref([]), loading=ref(false), processing=ref(null), comments=ref({}); let timer=null, previous=0, soundArmed=false;
function armSound(){soundArmed=true;} function beep(){ if(!soundArmed) return; const a=new AudioContext(); const o=a.createOscillator(); const g=a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value=880; g.gain.value=.04; o.start(); setTimeout(()=>{o.stop();a.close();},180); }
function typeLabel(t){return labels[t]||t;} function typeSeverity(t){return t==='player_permanent_ban'?'danger':(t.includes('unwarn')||t.includes('promote')?'success':'warn');}
function targetLabel(c){ return c.target_type === 'player' || c.card_type === 'player_permanent_ban' ? L.player : L.admin; }
function hasDetail(c){ return c.card_type==='admin_rename' || c.card_type==='admin_donate'; }
function formatDate(v){return new Date(v).toLocaleString('ru-RU');}
async function loadCards(silent=false){ if(!silent) loading.value=true; try{ const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : ''; const {data}=await api.get(`/admin/cards/pending${serverParam}`); if(previous && data.cards.length>previous){beep(); toast.add({severity:'info',summary:L.newCard,life:5000});} cards.value=data.cards||[]; previous=cards.value.length; authStore.pendingCardsCount = cards.value.length; }catch{ if(!silent) toast.add({severity:'error',summary:L.fail,life:4000}); } finally{ loading.value=false; }}
async function review(card,action){ processing.value=card.id; try{ const serverParam = authStore.currentServer ? `?server=${authStore.currentServer}` : ''; await api.post(`/admin/cards/${card.id}/review${serverParam}`,{action,comment:comments.value[card.id]||''}); toast.add({severity:'success',summary:L.done,life:2500}); await loadCards(true);}catch(e){toast.add({severity:'error',summary:L.fail,detail:e.response?.data?.error||'',life:4000});}finally{processing.value=null;}}
function goHistory(){router.push({name:'extended-card-history'});} onMounted(()=>{loadCards(); timer=setInterval(()=>loadCards(true),30000);}); onUnmounted(()=>clearInterval(timer));
</script>
