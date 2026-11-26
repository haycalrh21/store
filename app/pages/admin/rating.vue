<script setup lang="ts">
import { Star, MessageSquare, Trash2 } from 'lucide-vue-next'

interface RatingReview {
  id: string | number
  customerName: string
  customerEmail?: string
  productName: string
  rating: number
  comment: string
  createdAt?: string
}

const { showToast } = useStore()

const { data: rawRatings, refresh } = await useFetch<RatingReview[]>('/api/admin/ratings', {
  default: () => [],
})

const selectedStar = ref<number | 'all'>('all')
const localRatings = ref<RatingReview[]>([])

const reviews = computed<RatingReview[]>(() => {
  if (Array.isArray(rawRatings.value) && rawRatings.value.length > 0) {
    return rawRatings.value
  }
  return localRatings.value
})

const averageRating = computed(() => {
  if (reviews.value.length === 0) return '0.0'
  const total = reviews.value.reduce((acc, item) => acc + Number(item.rating || 0), 0)
  return (total / reviews.value.length).toFixed(1)
})

const filteredReviews = computed(() => {
  if (selectedStar.value === 'all') return reviews.value
  return reviews.value.filter((r) => Number(r.rating) === selectedStar.value)
})

const handleDeleteReview = async (id: string | number) => {
  try {
    await $fetch(`/api/admin/ratings/${id}`, { method: 'DELETE' })
    await refresh()
    showToast('Ulasan berhasil dihapus.')
  } catch {
    localRatings.value = localRatings.value.filter((r) => r.id !== id)
    showToast('Ulasan dihapus dari tampilan.')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header & Ringkasan Rating -->
    <div class="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:p-6">
      <div>
        <h1 class="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">Rating & Ulasan</h1>
        <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
          Pantau kepuasan pembeli dan ulasan produk di NEXASTORE.
        </p>
      </div>

      <div class="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 dark:border-amber-500/30 dark:bg-amber-950/40">
        <Star class="h-6 w-6 fill-amber-400 text-amber-500" />
        <div>
          <p class="text-lg font-extrabold leading-tight text-slate-900 dark:text-white">
            {{ averageRating }} <span class="text-xs font-semibold text-slate-500">/ 5.0</span>
          </p>
          <p class="text-[11px] font-medium text-amber-700 dark:text-amber-300">
            Dari {{ reviews.length }} ulasan
          </p>
        </div>
      </div>
    </div>

    <!-- Filter Bintang -->
    <div class="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        @click="selectedStar = 'all'"
        :class="[
          'rounded-xl px-3.5 py-1.5 text-xs font-bold transition',
          selectedStar === 'all'
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
        ]"
      >
        Semua ({{ reviews.length }})
      </button>

      <button
        v-for="star in [5, 4, 3, 2, 1]"
        :key="star"
        type="button"
        @click="selectedStar = star"
        :class="[
          'inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition',
          selectedStar === star
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
        ]"
      >
        <Star class="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        <span>{{ star }}</span>
      </button>
    </div>

    <!-- Daftar Ulasan -->
    <div
      v-if="filteredReviews.length === 0"
      class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"
    >
      <MessageSquare class="mx-auto h-10 w-10 text-slate-400" />
      <h3 class="mt-3 text-base font-bold text-slate-900 dark:text-white">Belum ada rating & ulasan</h3>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Ulasan pelanggan akan tampil di sini setelah transaksi selesai dinilai.
      </p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="rev in filteredReviews"
        :key="rev.id"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <p class="text-sm font-extrabold text-slate-900 dark:text-white">{{ rev.customerName }}</p>
              <span class="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                {{ rev.productName }}
              </span>
            </div>

            <div class="mt-1.5 flex items-center gap-1">
              <Star
                v-for="n in 5"
                :key="n"
                :class="[
                  'h-4 w-4',
                  n <= Number(rev.rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300 dark:text-slate-700',
                ]"
              />
            </div>
          </div>

          <button
            type="button"
            @click="handleDeleteReview(rev.id)"
            aria-label="Hapus ulasan"
            class="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-400"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </div>

        <p class="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300 sm:text-sm">
          {{ rev.comment }}
        </p>
      </div>
    </div>
  </div>
</template>