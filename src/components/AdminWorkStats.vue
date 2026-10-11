<template>
    <div v-if="stats" class="card">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
                <div class="font-semibold text-xl">{{ L.title }}</div>
                <div class="text-sm text-muted-color mt-1">{{ L.weekHint }} {{ stats.current_week?.range?.label }}</div>
            </div>
            <Button :label="showWeeks ? L.hideWeeks : L.showWeeks" icon="pi pi-calendar" severity="secondary" outlined size="small" @click="showWeeks = !showWeeks" />
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div class="p-4 rounded-lg bg-surface-100 dark:bg-surface-800">
                <div class="font-semibold mb-3">{{ L.currentWeek }}</div>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <StatCell :label="L.cardsCreated" :value="stats.current_week.stats.cards_created" />
                    <StatCell :label="L.pointsAdded" :value="stats.current_week.stats.points_added" />
                    <StatCell :label="L.cardsApproved" :value="stats.current_week.stats.cards_approved" />
                    <StatCell :label="L.cardsRejected" :value="stats.current_week.stats.cards_rejected" />
                    <StatCell :label="L.warningsIssued" :value="stats.current_week.stats.warnings_issued" />
                    <StatCell :label="L.adminsRemoved" :value="stats.current_week.stats.admins_removed" />
                </div>
            </div>
            <div class="p-4 rounded-lg bg-surface-100 dark:bg-surface-800">
                <div class="font-semibold mb-3">{{ L.allTime }}</div>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <StatCell :label="L.cardsCreated" :value="stats.all_time.cards_created" />
                    <StatCell :label="L.pointsAdded" :value="stats.all_time.points_added" />
                    <StatCell :label="L.cardsApproved" :value="stats.all_time.cards_approved" />
                    <StatCell :label="L.cardsRejected" :value="stats.all_time.cards_rejected" />
                    <StatCell :label="L.warningsIssued" :value="stats.all_time.warnings_issued" />
                    <StatCell :label="L.adminsRemoved" :value="stats.all_time.admins_removed" />
                </div>
            </div>
        </div>

        <DataTable v-if="showWeeks" :value="stats.weeks" stripedRows class="p-datatable-sm mt-4">
            <Column field="label" :header="L.week" />
            <Column :header="L.cardsCreated"><template #body="{ data }">{{ data.stats.cards_created }}</template></Column>
            <Column :header="L.pointsAdded"><template #body="{ data }">{{ data.stats.points_added }}</template></Column>
            <Column :header="L.cardsApproved"><template #body="{ data }">{{ data.stats.cards_approved }}</template></Column>
            <Column :header="L.cardsRejected"><template #body="{ data }">{{ data.stats.cards_rejected }}</template></Column>
            <Column :header="L.warningsIssued"><template #body="{ data }">{{ data.stats.warnings_issued }}</template></Column>
            <Column :header="L.adminsRemoved"><template #body="{ data }">{{ data.stats.admins_removed }}</template></Column>
        </DataTable>
    </div>
</template>

<script setup>
import { defineComponent, h, ref } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

const props = defineProps({ stats: { type: Object, default: null } });
const showWeeks = ref(false);
const L = {
    title: '\u0420\u0430\u0431\u043e\u0447\u0430\u044f \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430',
    weekHint: '\u0422\u0435\u043a\u0443\u0449\u0430\u044f \u043d\u0435\u0434\u0435\u043b\u044f:',
    currentWeek: '\u0417\u0430 \u0442\u0435\u043a\u0443\u0449\u0443\u044e \u043d\u0435\u0434\u0435\u043b\u044e',
    allTime: '\u0417\u0430 \u0432\u0441\u0435 \u0432\u0440\u0435\u043c\u044f',
    cardsCreated: '\u0421\u043e\u0437\u0434\u0430\u043d\u043e \u043a\u0430\u0440\u0442\u043e\u0447\u0435\u043a',
    pointsAdded: '\u0412\u044b\u0434\u0430\u043d\u043e \u0431\u0430\u043b\u043b\u043e\u0432',
    cardsApproved: '\u041e\u0434\u043e\u0431\u0440\u0435\u043d\u043e',
    cardsRejected: '\u041e\u0442\u043a\u0430\u0437\u0430\u043d\u043e',
    warningsIssued: '\u0412\u044b\u0434\u0430\u043d\u043e \u043f\u0440\u0435\u0434\u043e\u0432',
    adminsRemoved: '\u0421\u043d\u044f\u0442\u043e \u0430\u0434\u043c\u0438\u043d\u043e\u0432',
    showWeeks: '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u043d\u0435\u0434\u0435\u043b\u0438',
    hideWeeks: '\u0421\u043a\u0440\u044b\u0442\u044c \u043d\u0435\u0434\u0435\u043b\u0438',
    week: '\u041d\u0435\u0434\u0435\u043b\u044f'
};

const StatCell = defineComponent({
    props: { label: String, value: [Number, String] },
    setup(props) {
        return () => h('div', { class: 'min-h-20 rounded bg-surface-0 dark:bg-surface-900 p-3 flex flex-col justify-between' }, [
            h('div', { class: 'text-2xl font-bold text-primary' }, String(props.value ?? 0)),
            h('div', { class: 'text-xs text-muted-color leading-tight' }, props.label)
        ]);
    }
});
</script>
