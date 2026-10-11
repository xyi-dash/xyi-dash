<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();
const goBack = () => router.push({ name: 'extended-players' });
</script>

<template>
    <div class="flex flex-col gap-6">
        <div class="card">
            <div class="flex items-center gap-2">
                <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
                <div class="font-semibold text-xl">Выдача аксессуаров</div>
            </div>
        </div>

        <div class="card flex flex-col items-center justify-center text-center gap-4 py-12">
            <i class="pi pi-exclamation-triangle text-5xl text-yellow-500"></i>
            <div class="text-2xl font-semibold">Раздел скоро будет открыт</div>
            <div class="text-muted-color max-w-xl">На данный момент выдача аксессуаров находится в разработке.</div>
        </div>
    </div>
</template>
