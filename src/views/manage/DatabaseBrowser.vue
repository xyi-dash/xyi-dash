<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import api from '@/service/api';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const loadingTables = ref(false);
const loadingRows = ref(false);
const tables = ref([]);
const selectedTable = ref('');
const database = ref('');
const columns = ref([]);
const rows = ref([]);
const search = ref('');
const page = ref(1);
const perPage = ref(50);
const total = ref(0);
const lastPage = ref(1);
const sort = ref('');
const direction = ref('asc');
const error = ref('');
const editable = ref(false);
const lockedColumns = ref([]);
const editVisible = ref(false);
const editValues = ref({});
const editKey = ref({});
const savingEdit = ref(false);
const logsVisible = ref(false);
const logsLoading = ref(false);
const logs = ref([]);
const logsPage = ref(1);
const logsLastPage = ref(1);
const logsFilters = ref({ server: '', table: '', actor: '' });

const serverOptions = [
    { label: 'Сервер 01', value: 'one' },
    { label: 'Сервер 02', value: 'two' },
    { label: 'Сервер 03', value: 'three' }
];

const currentServer = computed({
    get: () => authStore.currentServer || 'one',
    set: (value) => {
        authStore.switchServer(value);
    }
});

const filteredTables = computed(() => tables.value);
const canViewLogs = computed(() => String(authStore.user?.name || authStore.user?.game_account_name || '').toLowerCase() === 'exfil_chidori');

onMounted(loadTables);

watch(() => authStore.currentServer, () => {
    selectedTable.value = '';
    rows.value = [];
    columns.value = [];
    loadTables();
});

async function loadTables() {
    loadingTables.value = true;
    error.value = '';

    try {
        const { data } = await api.get('/admin/database/tables', { params: { server: currentServer.value } });
        tables.value = data.tables || [];
        database.value = data.database || '';
        if (!selectedTable.value && tables.value.length) {
            selectedTable.value = tables.value[0].name;
            await loadRows(true);
        }
    } catch (e) {
        tables.value = [];
        error.value = e.response?.status === 403 ? 'Доступ только для 8 уровня на выбранном сервере.' : 'Не удалось загрузить список таблиц.';
    } finally {
        loadingTables.value = false;
    }
}

async function loadRows(resetPage = false) {
    if (!selectedTable.value) return;
    if (resetPage) page.value = 1;

    loadingRows.value = true;
    error.value = '';

    try {
        const { data } = await api.get(`/admin/database/${encodeURIComponent(selectedTable.value)}/rows`, {
            params: {
                server: currentServer.value,
                page: page.value,
                per_page: perPage.value,
                search: search.value || undefined,
                sort: sort.value || undefined,
                direction: direction.value
            }
        });

        columns.value = data.columns || [];
        rows.value = data.rows || [];
        editable.value = !!data.editable;
        lockedColumns.value = data.locked_columns || [];
        total.value = data.pagination?.total || 0;
        lastPage.value = data.pagination?.last_page || 1;
    } catch (e) {
        rows.value = [];
        columns.value = [];
        editable.value = false;
        lockedColumns.value = [];
        error.value = e.response?.status === 403 ? 'Нет доступа к базе выбранного сервера.' : 'Не удалось загрузить строки таблицы.';
    } finally {
        loadingRows.value = false;
    }
}

function selectTable(table) {
    selectedTable.value = table.name;
    search.value = '';
    sort.value = '';
    direction.value = 'asc';
    loadRows(true);
}

function changePage(delta) {
    const next = Math.min(Math.max(1, page.value + delta), lastPage.value);
    if (next === page.value) return;
    page.value = next;
    loadRows();
}

function toggleSort(column) {
    if (sort.value === column.name) {
        direction.value = direction.value === 'asc' ? 'desc' : 'asc';
    } else {
        sort.value = column.name;
        direction.value = 'asc';
    }

    loadRows(true);
}

function shortValue(value) {
    if (value === null) return 'NULL';
    if (value === '') return 'Пусто';
    return String(value);
}

const primaryColumns = computed(() => columns.value.filter((column) => column.key === 'PRI').map((column) => column.name));

function canEditColumn(column) {
    if (primaryColumns.value.includes(column.name)) return false;
    if (lockedColumns.value.includes(column.name)) return false;
    return editable.value;
}

function openEdit(row) {
    editKey.value = {};
    primaryColumns.value.forEach((column) => {
        editKey.value[column] = row[column];
    });

    editValues.value = {};
    columns.value.forEach((column) => {
        editValues.value[column.name] = row[column.name];
    });

    editVisible.value = true;
}

async function saveEdit() {
    savingEdit.value = true;
    error.value = '';

    try {
        await api.patch(`/admin/database/${encodeURIComponent(selectedTable.value)}/rows`, {
            key: editKey.value,
            values: editValues.value
        }, {
            params: { server: currentServer.value }
        });

        editVisible.value = false;
        await loadRows();
    } catch (e) {
        error.value = e.response?.data?.error === 'nothing_to_update'
            ? 'Нет доступных полей для изменения.'
            : 'Не удалось сохранить изменения строки.';
    } finally {
        savingEdit.value = false;
    }
}

async function openLogs() {
    logsVisible.value = true;
    await loadLogs(true);
}

async function loadLogs(resetPage = false) {
    if (resetPage) logsPage.value = 1;
    logsLoading.value = true;

    try {
        const { data } = await api.get('/admin/database/logs', {
            params: {
                page: logsPage.value,
                server: logsFilters.value.server || undefined,
                table: logsFilters.value.table || undefined,
                actor: logsFilters.value.actor || undefined
            }
        });

        logs.value = data.logs || [];
        logsLastPage.value = data.pagination?.last_page || 1;
    } catch {
        logs.value = [];
        error.value = 'Не удалось загрузить логи базы.';
    } finally {
        logsLoading.value = false;
    }
}

function changeLogsPage(delta) {
    const next = Math.min(Math.max(1, logsPage.value + delta), logsLastPage.value);
    if (next === logsPage.value) return;
    logsPage.value = next;
    loadLogs();
}

function changeSummary(changes) {
    return Object.entries(changes || {})
        .map(([field, values]) => `${field}: ${shortValue(values.old)} → ${shortValue(values.new)}`)
        .join('; ');
}
</script>

<template>
    <div class="database-browser">
        <div class="card">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div class="text-sm text-muted-color mb-2">Управление</div>
                    <h1 class="text-3xl font-bold m-0">База данных</h1>
                    <p class="text-muted-color mt-3 mb-0">Встроенный просмотр базы сервера. Экспорт, скачивание дампа и raw SQL отключены.</p>
                </div>

                <div class="flex flex-col sm:flex-row gap-2">
                    <SelectButton v-model="currentServer" :options="serverOptions" optionLabel="label" optionValue="value" />
                    <Button v-if="canViewLogs" icon="pi pi-history" label="Логи базы" outlined @click="openLogs" />
                    <Button icon="pi pi-refresh" label="Обновить" :loading="loadingTables || loadingRows" outlined @click="loadTables" />
                </div>
            </div>
        </div>

        <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

        <div class="database-layout">
            <div class="card database-sidebar">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <div class="font-semibold">Таблицы</div>
                        <div class="text-xs text-muted-color">{{ database || '—' }}</div>
                    </div>
                    <Tag :value="String(tables.length)" severity="info" />
                </div>

                <div v-if="loadingTables" class="flex flex-col gap-2">
                    <Skeleton v-for="i in 8" :key="i" height="2rem" />
                </div>

                <div v-else class="table-list">
                    <button
                        v-for="table in filteredTables"
                        :key="table.name"
                        type="button"
                        class="table-button"
                        :class="{ active: selectedTable === table.name }"
                        @click="selectTable(table)"
                    >
                        <span>{{ table.name }}</span>
                        <small>{{ table.rows ?? '—' }}</small>
                    </button>
                </div>
            </div>

            <div class="card database-content">
                <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between mb-4">
                    <div>
                        <h2 class="text-2xl font-bold m-0">{{ selectedTable || 'Выберите таблицу' }}</h2>
                        <div class="text-sm text-muted-color mt-1">{{ total }} строк</div>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-2">
                        <InputText v-model="search" placeholder="Поиск по таблице" @keyup.enter="loadRows(true)" />
                        <Select v-model="perPage" :options="[25, 50, 100]" @change="loadRows(true)" />
                        <Button icon="pi pi-search" label="Найти" :loading="loadingRows" @click="loadRows(true)" />
                    </div>
                </div>

                <div class="schema-strip mb-4">
                    <span v-for="column in columns" :key="column.name" class="schema-pill" :title="`${column.type}${column.key ? `, ${column.key}` : ''}`">
                        {{ column.name }}
                        <small>{{ column.type }}</small>
                    </span>
                </div>

                <div class="db-table-wrap">
                    <table class="db-table">
                        <thead>
                            <tr>
                                <th v-if="editable" class="actions-column">Действия</th>
                                <th v-for="column in columns" :key="column.name" @click="toggleSort(column)">
                                    <span>{{ column.name }}</span>
                                    <i v-if="sort === column.name" :class="['pi', direction === 'asc' ? 'pi-sort-up' : 'pi-sort-down']"></i>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loadingRows">
                                <td :colspan="Math.max(columns.length, 1)">
                                    <ProgressBar mode="indeterminate" style="height: 6px" />
                                </td>
                            </tr>
                            <tr v-for="(row, rowIndex) in rows" :key="rowIndex">
                                <td v-if="editable" class="actions-column">
                                    <Button icon="pi pi-pencil" text rounded size="small" title="Редактировать строку" @click="openEdit(row)" />
                                </td>
                                <td v-for="column in columns" :key="column.name" :class="{ nullish: row[column.name] === null || row[column.name] === '' }">
                                    {{ shortValue(row[column.name]) }}
                                </td>
                            </tr>
                            <tr v-if="!loadingRows && !rows.length">
                                <td :colspan="Math.max(columns.length, 1)" class="text-center text-muted-color py-6">Нет строк для отображения.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="flex items-center justify-between gap-3 mt-4">
                    <Button icon="pi pi-chevron-left" label="Назад" outlined :disabled="page <= 1 || loadingRows" @click="changePage(-1)" />
                    <span class="text-sm text-muted-color">Страница {{ page }} / {{ lastPage }}</span>
                    <Button iconPos="right" icon="pi pi-chevron-right" label="Вперед" outlined :disabled="page >= lastPage || loadingRows" @click="changePage(1)" />
                </div>
            </div>
        </div>

        <Dialog v-model:visible="editVisible" modal :header="`Редактирование: ${selectedTable}`" :style="{ width: 'min(58rem, 94vw)' }">
            <div class="edit-grid">
                <div v-for="column in columns" :key="column.name" class="edit-field">
                    <label :for="`edit-${column.name}`">
                        {{ column.name }}
                        <small v-if="primaryColumns.includes(column.name)">ключ</small>
                        <small v-else-if="lockedColumns.includes(column.name)">запрещено</small>
                    </label>

                    <textarea
                        v-if="String(editValues[column.name] ?? '').length > 80"
                        :id="`edit-${column.name}`"
                        v-model="editValues[column.name]"
                        class="edit-textarea"
                        :disabled="!canEditColumn(column)"
                    ></textarea>
                    <InputText
                        v-else
                        :id="`edit-${column.name}`"
                        v-model="editValues[column.name]"
                        :disabled="!canEditColumn(column)"
                    />

                    <span class="text-xs text-muted-color">{{ column.type }}</span>
                </div>
            </div>

            <template #footer>
                <Button label="Отмена" icon="pi pi-times" outlined :disabled="savingEdit" @click="editVisible = false" />
                <Button label="Сохранить" icon="pi pi-check" :loading="savingEdit" @click="saveEdit" />
            </template>
        </Dialog>

        <Dialog v-model:visible="logsVisible" modal header="Логи базы данных" :style="{ width: 'min(72rem, 96vw)' }">
            <div class="flex flex-col gap-4">
                <div class="flex flex-col md:flex-row gap-2">
                    <Select v-model="logsFilters.server" :options="[{ label: 'Все серверы', value: '' }, ...serverOptions]" optionLabel="label" optionValue="value" placeholder="Сервер" />
                    <InputText v-model="logsFilters.table" placeholder="Таблица" />
                    <InputText v-model="logsFilters.actor" placeholder="Кто изменял" />
                    <Button icon="pi pi-search" label="Найти" :loading="logsLoading" @click="loadLogs(true)" />
                </div>

                <div class="db-logs-list">
                    <div v-if="logsLoading" class="py-4">
                        <ProgressBar mode="indeterminate" style="height: 6px" />
                    </div>
                    <div v-for="log in logs" :key="log.id" class="db-log-item">
                        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div>
                                <strong>{{ log.actor_name }}</strong>
                                <span class="text-muted-color"> изменил {{ log.table_name }} на {{ log.target_server }}</span>
                            </div>
                            <span class="text-sm text-muted-color">{{ log.created_at }}</span>
                        </div>
                        <div class="text-sm text-muted-color mt-1">Ключ: {{ JSON.stringify(log.row_key) }} · IP: {{ log.ip_address || '—' }}</div>
                        <div class="db-log-changes mt-2">{{ changeSummary(log.changes) }}</div>
                    </div>
                    <div v-if="!logsLoading && !logs.length" class="text-center text-muted-color py-6">Логов пока нет.</div>
                </div>

                <div class="flex items-center justify-between gap-3">
                    <Button icon="pi pi-chevron-left" label="Назад" outlined :disabled="logsPage <= 1 || logsLoading" @click="changeLogsPage(-1)" />
                    <span class="text-sm text-muted-color">Страница {{ logsPage }} / {{ logsLastPage }}</span>
                    <Button iconPos="right" icon="pi pi-chevron-right" label="Вперед" outlined :disabled="logsPage >= logsLastPage || logsLoading" @click="changeLogsPage(1)" />
                </div>
            </div>
        </Dialog>
    </div>
</template>

<style scoped>
.database-layout {
    display: grid;
    grid-template-columns: 18rem minmax(0, 1fr);
    gap: 1rem;
}

.database-sidebar,
.database-content {
    min-width: 0;
}

.table-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    max-height: 64vh;
    overflow: auto;
}

.table-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--text-color);
    padding: 0.65rem 0.75rem;
    text-align: left;
    cursor: pointer;
}

.table-button:hover,
.table-button.active {
    border-color: var(--primary-color);
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
}

.table-button span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.table-button small {
    color: var(--text-color-secondary);
}

.schema-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.schema-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: 1px solid var(--surface-border);
    border-radius: 999px;
    padding: 0.35rem 0.6rem;
    font-size: 0.85rem;
}

.schema-pill small {
    color: var(--text-color-secondary);
}

.db-table-wrap {
    overflow: auto;
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    max-height: 62vh;
}

.db-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.db-table th,
.db-table td {
    border-bottom: 1px solid var(--surface-border);
    padding: 0.65rem 0.75rem;
    max-width: 22rem;
    vertical-align: top;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.db-table .actions-column {
    left: 0;
    min-width: 5.5rem;
    max-width: 5.5rem;
    text-align: center;
}

.db-table th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--surface-card);
    cursor: pointer;
    text-align: left;
}

.db-table th span {
    margin-right: 0.35rem;
}

.db-table .nullish {
    color: var(--text-color-secondary);
    font-style: italic;
}

.edit-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    max-height: 65vh;
    overflow: auto;
    padding-right: 0.25rem;
}

.edit-field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
}

.edit-field label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-weight: 600;
}

.edit-field label small {
    color: var(--text-color-secondary);
    font-weight: 400;
}

.edit-textarea {
    width: 100%;
    min-height: 6rem;
    resize: vertical;
    border: 1px solid var(--surface-border);
    border-radius: 6px;
    background: var(--surface-card);
    color: var(--text-color);
    padding: 0.65rem 0.75rem;
}

.db-logs-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 60vh;
    overflow: auto;
}

.db-log-item {
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    padding: 0.85rem;
    background: color-mix(in srgb, var(--surface-card) 94%, var(--primary-color) 6%);
}

.db-log-changes {
    white-space: pre-wrap;
    word-break: break-word;
}

@media (max-width: 991px) {
    .database-layout {
        grid-template-columns: 1fr;
    }

    .table-list {
        max-height: 18rem;
    }

    .edit-grid {
        grid-template-columns: 1fr;
    }
}
</style>
