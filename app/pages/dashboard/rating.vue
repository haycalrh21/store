<script setup lang="ts">
import { Star, X, MessageSquare, CheckCircle2 } from 'lucide-vue-next'
import type { Product } from '~/composables/useStore'

const { orders, reviews, submitProductReview } = useAccount()

const unratedItems = computed(() => {
  const list: { orderId: string; product: Product }[] = []
  for (const order of orders.value) {
    if (order.status === 'delivered') {
      for (const item of order.items) {
        if (!item.rated) {
          list.push({ orderId: order.id, product: item.product })
        }
      }
    }
  }
  return list
})

const ratingModal = ref<{ open: boolean; orderId: string; product: Product | null }>({
  open: false,
  orderId: '',
  product: null,
})
const selectedStars = ref(5)
const reviewComment = ref('')

const openRatingModal = (orderId: string, product: Product) => {
  ratingModal.value = { open: true, orderId, product }
  selectedStars.value = 5
  reviewComment.value = ''
}

const handleSaveReview = () => {
  if (!ratingModal.value.product) return
  submitProductReview({
    orderId: ratingModal.value.orderId,
    product: ratingModal.value.product,
    rating: selectedStars.value,
    comment: reviewComment.value.trim() || 'Produk original, kualitas mantap dan sesuai deskripsi!',
  })
  ratingModal.value.open = false
}
</script>

<template>
  <div class="space-y-6">
    <!-- Section 1: Menunggu Penilaian -->
    <div v-if="unratedItems.length > 0" class="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 sm:p-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-extrabold text-slate-900">Menunggu Penilaian Kamu</h2>
          <p class="mt-0.5 text-xs text-slate-500">
            Pesanan sudah sampai—bagikan pengalamanmu untuk membantu pembeli lain.
          </p>
        </div>
        <span class="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white">
          {{ unratedItems.length }} Produk
        </span>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div
          v-for="entry in unratedItems"
          :key="`${entry.orderId}-${entry.product.id}`"
          class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs"
        >
          <div class="flex min-w-0 items-center gap-3">
            <img
              :src="entry.product.image"
              :alt="entry.product.name"
              style="width: 48px; height: 48px;"
              class="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover"
            />
            <div class="min-w-0">
              <p class="truncate text-sm font-bold text-slate-900">{{ entry.product.name }}</p>
              <p class="mt-0.5 text-xs text-slate-500">{{ entry.orderId }}</p>
            </div>
          </div>

          <button
            @click="openRatingModal(entry.orderId, entry.product)"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
          >
            <Star class="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
            <span>Beri Nilai</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Section 2: Riwayat Ulasan Produk -->
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <div class="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 class="text-base font-extrabold text-slate-900">Riwayat Ulasan Produk ({{ reviews.length }})</h2>
          <p class="mt-0.5 text-xs text-slate-500">Daftar ulasan dan rating yang telah kamu kirimkan.</p>
        </div>
      </div>

      <div v-if="reviews.length === 0" class="py-12 text-center text-sm text-slate-500">
        Belum ada ulasan yang kamu kirimkan.
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="rev in reviews"
          :key="rev.id"
          class="flex flex-col gap-4 py-5 first:pt-4 last:pb-0 sm:flex-row sm:items-start"
        >
          <!-- Thumbnail Produk Terkunci 64x64px -->
          <img
            :src="rev.productImage"
            :alt="rev.productName"
            style="width: 64px; height: 64px;"
            class="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover"
          />

          <!-- Isi Ulasan -->
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <NuxtLink
                  :to="`/products/${rev.productId}`"
                  class="text-sm font-bold text-slate-900 transition hover:text-indigo-600"
                >
                  {{ rev.productName }}
                </NuxtLink>
                <div class="mt-1 flex items-center gap-2">
                  <div class="flex items-center gap-0.5">
                    <Star
                      v-for="s in 5"
                      :key="s"
                      style="width: 15px; height: 15px;"
                      :class="[
                        'h-4 w-4',
                        s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200',
                      ]"
                    />
                  </div>
                  <span class="text-xs font-bold text-slate-700">{{ rev.rating }}.0</span>
                  <span class="text-slate-300">•</span>
                  <span class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 class="h-3.5 w-3.5" />
                    Pembelian Terverifikasi
                  </span>
                </div>
              </div>

              <div class="text-left sm:text-right">
                <span class="block text-xs font-medium text-slate-400">{{ rev.date }}</span>
                <span class="block text-[11px] text-slate-400">{{ rev.orderId }}</span>
              </div>
            </div>

            <div class="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
              "{{ rev.comment }}"
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Beri Rating -->
    <div
      v-if="ratingModal.open && ratingModal.product"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-2 font-extrabold text-slate-900">
            <MessageSquare class="h-5 w-5 text-indigo-600" />
            <span>Beri Rating Produk</span>
          </div>
          <button
            @click="ratingModal.open = false"
            class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
          <img
            :src="ratingModal.product.image"
            :alt="ratingModal.product.name"
            style="width: 56px; height: 56px;"
            class="h-14 w-14 shrink-0 rounded-xl object-cover"
          />
          <div class="min-w-0">
            <p class="truncate text-sm font-bold text-slate-900">{{ ratingModal.product.name }}</p>
            <p class="text-xs text-slate-500">Order: {{ ratingModal.orderId }}</p>
          </div>
        </div>

        <div class="mt-5 text-center">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Pilih Bintang</p>
          <div class="mt-2 flex justify-center gap-2">
            <button
              v-for="star in 5"
              :key="star"
              type="button"
              @click="selectedStars = star"
              class="p-1 transition hover:scale-110"
            >
              <Star
                style="width: 30px; height: 30px;"
                :class="[
                  'h-7 w-7',
                  star <= selectedStars ? 'fill-amber-400 text-amber-400' : 'text-slate-300',
                ]"
              />
            </button>
          </div>
        </div>

        <div class="mt-5">
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Ulasan Kamu</label>
          <textarea
            v-model="reviewComment"
            rows="3"
            placeholder="Ceritakan pengalamanmu menggunakan produk ini..."
            class="mt-1.5 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
          />
        </div>

        <div class="mt-6 flex gap-3">
          <button
            @click="ratingModal.open = false"
            class="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            @click="handleSaveReview"
            class="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
          >
            Kirim Rating
          </button>
        </div>
      </div>
    </div>
  </div>
</template>