<script setup lang="ts">
import type { NuxtError } from '#app'
import { ShieldAlert, ArrowLeft } from 'lucide-vue-next'

const props = defineProps<{ error: NuxtError }>()

const is403 = computed(() => props.error.statusCode === 403)
const is404 = computed(() => props.error.statusCode === 404)

const title = computed(() => {
  if (is403.value) return 'Akses ditolak'
  if (is404.value) return 'Halaman tidak ditemukan'
  return 'Terjadi kesalahan'
})

const description = computed(() => {
  if (is403.value) return 'Halaman ini hanya untuk admin.'
  if (is404.value) return 'Halaman yang kamu cari tidak ada atau sudah dipindahkan.'
  return 'Coba lagi beberapa saat.'
})

const goHome = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <div class="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
        <ShieldAlert class="h-6 w-6" />
      </div>
      <p class="mt-4 text-5xl font-extrabold text-slate-900">{{ error.statusCode }}</p>
      <h1 class="mt-2 text-xl font-bold text-slate-900">{{ title }}</h1>
      <p class="mt-1.5 text-sm text-slate-500">{{ description }}</p>
      <button
        @click="goHome"
        class="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
      >
        <ArrowLeft class="h-4 w-4" />
        Kembali ke beranda
      </button>
    </div>
  </div>
</template>