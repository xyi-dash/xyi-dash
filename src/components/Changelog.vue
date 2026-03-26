<script setup>
import { ref } from 'vue';

const visible = defineModel('visible', { type: Boolean, default: false });

const changelog = [
    {
        version: '1.1.0',
        date: '26.03.2026',
        changes: [
            {
                type: 'feature',
                title: 'Редактирование статистики игрока',
                description: 'Добавлена возможность редактирования статистики игрока для администраторов 8 уровня',
                items: [
                    'Редактирование никнейма',
                    'Редактирование уровня, денег, доната',
                    'Редактирование убийств и смертей',
                    'Редактирование Google Authenticator и Google Key',
                    'Редактирование статистики Gangwar (Grove, Ballas, Vagos, Aztecas)',
                    'Редактирование статистики Matchmaking (ELO, игры, победы, убийства, смерти, MVP)'
                ]
            },
            {
                type: 'fix',
                title: 'Исправления',
                description: 'Исправлены критические ошибки',
                items: [
                    'Исправлен редирект с админ панели на дашборд',
                    'Исправлено отображение Google Authenticator (1 = Да, 0 = Нет)',
                    'Исправлено отображение Google Key (показывает "-" когда пустой)',
                    'Исправлена ошибка поиска игроков'
                ]
            }
        ]
    }
];

const getTypeIcon = (type) => {
    switch (type) {
        case 'feature': return 'pi-plus-circle';
        case 'fix': return 'pi-wrench';
        case 'improvement': return 'pi-arrow-up';
        default: return 'pi-circle';
    }
};

const getTypeSeverity = (type) => {
    switch (type) {
        case 'feature': return 'success';
        case 'fix': return 'warn';
        case 'improvement': return 'info';
        default: return 'secondary';
    }
};
</script>

<template>
    <Dialog v-model:visible="visible" modal header="Changelog" :style="{ width: '50rem' }" :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
        <div class="flex flex-col gap-6">
            <div v-for="release in changelog" :key="release.version" class="border-b border-surface-200 dark:border-surface-700 pb-6 last:border-b-0">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <Tag :value="`v${release.version}`" severity="info" />
                        <span class="text-muted-color text-sm">{{ release.date }}</span>
                    </div>
                </div>

                <div class="flex flex-col gap-4">
                    <div v-for="(change, idx) in release.changes" :key="idx" class="card mb-0">
                        <div class="flex items-start gap-3">
                            <i :class="['pi', getTypeIcon(change.type), 'text-xl']" :style="{ color: `var(--p-${getTypeSeverity(change.type)}-500)` }"></i>
                            <div class="flex-1">
                                <div class="font-semibold mb-2">{{ change.title }}</div>
                                <div class="text-muted-color text-sm mb-3">{{ change.description }}</div>
                                <ul class="list-none p-0 m-0 flex flex-col gap-2">
                                    <li v-for="(item, itemIdx) in change.items" :key="itemIdx" class="flex items-start gap-2">
                                        <i class="pi pi-check text-green-500 text-sm mt-0.5"></i>
                                        <span class="text-sm">{{ item }}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Dialog>
</template>
