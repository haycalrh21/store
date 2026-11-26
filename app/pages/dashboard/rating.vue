<script setup lang="ts">
import { Star, X, MessageSquare, CheckCircle2, Loader2, ShoppingBag } from 'lucide-vue-next'

interface DbOrderItem {
  id: number
  orderId: number
  productId: number | null
  productName: string
  productImage: string
  price: number
  quantity: number
}

interface DbOrder {
  id: number
  orderNumber: string
  status: string
  statusPengiriman?: string
  createdAt: string
  items: DbOrderItem[]
}

interface DbRating {
  id: number
  orderId: number
  orderNumber: string
  productId: number | null
  productName: string
  productImage: string
  rating: number
  comment: string
  createdAt: string
}

interface UnratedProductEntry {
  orderId: number
  orderNumber: string
  shippingStatus: string
  productId: number | null
  productName: string
  productImage: string
}

const { showToast } = useStore()

const { data: rawOrders, pending: loadingOrders, refresh: refreshOrders } = await useFetch<DbOrder[]>(
  '/api/orders',
  { default: () => [] }
)
const { data: rawReviews, refresh: refreshReviews } = await useFetch<DbRating[]>(
  '/api/user/ratings',
  { default: () => [] }
)

const orders = computed(() => (Array.isArray(rawOrders.value) ? rawOrders.value : []))
const reviews = computed(() => (Array.isArray(rawReviews.value) ? rawReviews.value : []))

const ratedKeys = computed(() => {
  const set = new Set<string>()
  for (const r of reviews.value) {
    set.add(`${r.orderId}::${String(r.productName || '').toLowerCase()}`)
  }
  return set
})

const normalizeStatus = (val: string) => String(val || '').trim().toLowerCase()

const canRate = (shippingStatus: string) => {
  const s = normalizeStatus(shippingStatus)
  return s === 'delivered' || s === 'sudah sampai' || s === 'sampai' || s === 'selesai'
}

const shippingStatusLabel: Record<string, string> = {
  pending: 'Menunggu Pengiriman',
  'menunggu pengiriman': 'Menunggu Pengiriman',
  packed: 'Sedang Dikemas',
  dikemas: 'Sedang Dikemas',
  'sedang dikemas': 'Sedang Dikemas',
  shipped: 'Dalam Pengiriman',
  dikirim: 'Dalam Pengiriman',
  'dalam pengiriman': 'Dalam Pengiriman',
  delivered: 'Sudah Sampai',
  'sudah sampai': 'Sudah Sampai',
  sampai: 'Sudah Sampai',
  selesai: 'Sudah Sampai',
}

// Ambil semua item produk dari pesanan user yang tidak dibatalkan & belum dinilai
const unratedItems = computed<UnratedProductEntry[]>(() => {
  const list: UnratedProductEntry[] = []
  const excluded = ['cancel', 'cancelled', 'dibatalkan', 'batal', 'failed', 'gagal']

  for (const order of orders.value) {
    const paymentStatus = normalizeStatus(order.status)
    const shippingStatus = normalizeStatus(order.statusPengiriman || 'pending')
    if (excluded.includes(paymentStatus) || excluded.includes(shippingStatus)) continue

    for (const item of order.items || []) {
      const key = `${order.id}::${normalizeStatus(item.productName)}`
      if (!ratedKeys.value.has(key)) {
        list.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          shippingStatus,
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
        })
      }
    }
  }
  return list
})

const ratingModal = ref<{
  open: boolean
  entry: UnratedProductEntry | null
}>({
  open: false,
  entry: null,
})

const selectedStars = ref(5)
const reviewComment = ref('')
const isSubmitting = ref(false)

const openRatingModal = (entry: UnratedProductEntry) => {
  if (!canRate(entry.shippingStatus)) return
  ratingModal.value = { open: true, entry }
  selectedStars.value = 5
  reviewComment.value = ''
}

const handleSaveReview = async () => {
  const entry = ratingModal.value.entry
  if (!entry || !canRate(entry.shippingStatus)) return

  isSubmitting.value = true
  try {
    await $fetch('/api/user/ratings', {
      method: 'POST',
      body: {
        orderId: entry.orderId,
        orderNumber: entry.orderNumber,
        productId: entry.productId,
        productName: entry.productName,
        productImage: entry.productImage,
        rating: selectedStars.value,
        comment:
          reviewComment.value.trim() ||
          'Produk original, kualitas mantap dan sesuai deskripsi!',
      },
    })

    await Promise.all([refreshReviews(), refreshOrders()])
    ratingModal.value.open = false
    showToast('Terima kasih! Penilaian produk berhasil dikirim.')
  } catch (err: any) {
    showToast(err?.data?.statusMessage || 'Gagal mengirim penilaian.')
  } finally {
    isSubmitting.value = false
  }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
</script>

<template>
  <div class="space-y-6">
    <!-- Section 1: Daftar Produk dari Pesanan User -->
    <div class="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-500/30 dark:bg-indigo-950/30 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-extrabold text-slate-900 dark:text-white">
            Beri Penilaian Produk Pesananmu
          </h2>
          <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Penilaian dapat diberikan setelah status pengiriman pesananmu <strong>Sudah Sampai</strong>.
          </p>
        </div>

        <span class="rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
          {{ unratedItems.length }} Belum Dinilai
        </span>
      </div>

      <div v-if="loadingOrders" class="mt-4 text-xs font-semibold text-slate-500">
        Memuat daftar pesanan kamu...
      </div>

      <div
        v-else-if="unratedItems.length === 0"
        class="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-white/80 p-6 text-center dark:border-indigo-500/30 dark:bg-slate-900/60"
      >
        <ShoppingBag class="h-8 w-8 text-indigo-400" />
        <p class="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200">
          Semua produk dari pesananmu sudah dinilai atau kamu belum memiliki pesanan.
        </p>
        <NuxtLink
          to="/products"
          class="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
        >
          Belanja Produk Sekarang
        </NuxtLink>
      </div>

      <div v-else class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div
          v-for="entry in unratedItems"
          :key="`${entry.orderId}-${entry.productName}`"
          class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div class="flex min-w-0 items-center gap-3">
            <img
              :src="entry.productImage"
              :alt="entry.productName"
              style="width: 48px; height: 48px;"
              class="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
            />
            <div class="min-w-0">
              <p class="truncate text-sm font-bold text-slate-900 dark:text-white">
                {{ entry.productName }}
              </p>
              <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {{ entry.orderNumber }} •
                <span
                  :class="
                    canRate(entry.shippingStatus)
                      ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  "
                >
                  {{ shippingStatusLabel[entry.shippingStatus] || entry.shippingStatus }}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            :disabled="!canRate(entry.shippingStatus)"
            :title="
              canRate(entry.shippingStatus)
                ? 'Beri nilai produk ini'
                : 'Menunggu status pengiriman Sudah Sampai'
            "
            @click="openRatingModal(entry)"
            :class="[
              'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold shadow-xs transition',
              canRate(entry.shippingStatus)
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
            ]"
          >
            <Star
              :class="[
                'h-3.5 w-3.5',
                canRate(entry.shippingStatus)
                  ? 'fill-amber-300 text-amber-300'
                  : 'text-slate-400 dark:text-slate-500',
              ]"
            />
            <span>Beri Nilai</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Section 2: Riwayat Ulasan Produk -->
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div class="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h2 class="text-base font-extrabold text-slate-900 dark:text-white">
            Riwayat Ulasan Produk ({{ reviews.length }})
          </h2>
          <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Daftar ulasan dan rating yang telah kamu kirimkan.
          </p>
        </div>
      </div>

      <div v-if="reviews.length === 0" class="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
        Belum ada ulasan yang kamu kirimkan.
      </div>

      <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
        <div
          v-for="rev in reviews"
          :key="rev.id"
          class="flex flex-col gap-4 py-5 first:pt-4 last:pb-0 sm:flex-row sm:items-start"
        >
          <img
            :src="rev.productImage"
            :alt="rev.productName"
            style="width: 64px; height: 64px;"
            class="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
          />

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <NuxtLink
                  :to="rev.productId ? `/products/${rev.productId}` : '/products'"
                  class="text-sm font-bold text-slate-900 transition hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
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
                        s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700',
                      ]"
                    />
                  </div>
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ rev.rating }}.0</span>
                  <span class="text-slate-300 dark:text-slate-700">•</span>
                  <span class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 class="h-3.5 w-3.5" />
                    Pembelian Terverifikasi
                  </span>
                </div>
              </div>

              <div class="text-left sm:text-right">
                <span class="block text-xs font-medium text-slate-400">{{ formatDate(rev.createdAt) }}</span>
                <span class="block text-[11px] text-slate-400">{{ rev.orderNumber }}</span>
              </div>
            </div>

            <div class="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
              "{{ rev.comment }}"
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal / Popup Beri Rating -->
    <div
      v-if="ratingModal.open && ratingModal.entry"
      @click.self="ratingModal.open = false"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div class="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
            <MessageSquare class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span>Beri Rating Produk</span>
          </div>
          <button
            type="button"
            @click="ratingModal.open = false"
            class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
          <img
            :src="ratingModal.entry.productImage"
            :alt="ratingModal.entry.productName"
            style="width: 56px; height: 56px;"
            class="h-14 w-14 shrink-0 rounded-xl object-cover"
          />
          <div class="min-w-0">
            <p class="truncate text-sm font-bold text-slate-900 dark:text-white">{{ ratingModal.entry.productName }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Order: {{ ratingModal.entry.orderNumber }}</p>
          </div>
        </div>

        <div class="mt-5 text-center">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pilih Bintang</p>
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
                  star <= selectedStars ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700',
                ]"
              />
            </button>
          </div>
        </div>

        <div class="mt-5">
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Ulasan Kamu</label>
          <textarea
            v-model="reviewComment"
            rows="3"
            placeholder="Ceritakan pengalamanmu menggunakan produk ini..."
            class="mt-1.5 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div class="mt-6 flex gap-3">
          <button
            type="button"
            @click="ratingModal.open = false"
            :disabled="isSubmitting"
            class="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
          >
            Batal
          </button>
          <button
            type="button"
            @click="handleSaveReview"
            :disabled="isSubmitting"
            class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin" />
            <span>{{ isSubmitting ? 'Mengirim...' : 'Kirim Rating' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>