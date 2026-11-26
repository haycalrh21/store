<script setup lang="ts">
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  MapPin,
  Save,
  CreditCard,
  Clock,
  XCircle,
  Loader2,
  User,
} from 'lucide-vue-next'

type DbOrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'failed'
type DbShippingStatus = 'pending' | 'packed' | 'shipped' | 'delivered'

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
  userId: string | null
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingAddress: string
  shippingNotes: string | null
  shippingCourier: string
  subtotal: number
  shippingCost: number
  insuranceCost: number
  discountAmount: number
  grandTotal: number
  status: DbOrderStatus
  statusPengiriman: DbShippingStatus | string
  paymentMethod: string | null
  createdAt: string
  items: DbOrderItem[]
}

const route = useRoute()
const { formatRupiah, showToast } = useStore()

const { data: ordersData, pending: isLoading, refresh } = await useFetch<DbOrder[]>(
  '/api/orders/admin',
  { default: () => [] }
)

const order = computed(() =>
  (ordersData.value ?? []).find((o) => o.orderNumber === String(route.params.id))
)

const normalizeShippingStatus = (raw?: string): DbShippingStatus => {
  const s = String(raw || 'pending').trim().toLowerCase()
  if (s === 'packed' || s === 'dikemas' || s === 'sedang dikemas') return 'packed'
  if (s === 'shipped' || s === 'dikirim' || s === 'dalam perjalanan') return 'shipped'
  if (s === 'delivered' || s === 'sudah sampai' || s === 'sampai' || s === 'selesai') return 'delivered'
  return 'pending'
}

const editShippingStatus = ref<DbShippingStatus>('pending')
const editNotes = ref('')
const isSaving = ref(false)

watch(
  order,
  (val) => {
    if (!val) return
    editShippingStatus.value = normalizeShippingStatus(val.statusPengiriman)
    editNotes.value = val.shippingNotes || ''
  },
  { immediate: true }
)

const handleSaveOrder = async () => {
  if (!order.value) return
  isSaving.value = true
  try {
    await $fetch('/api/orders', {
      method: 'POST',
      body: {
        orderNumber: order.value.orderNumber,
        statusPengiriman: editShippingStatus.value,
        shippingNotes: editNotes.value.trim() || null,
      },
    })
    showToast(`Status pengiriman & resi ${order.value.orderNumber} berhasil diperbarui.`)
    await refresh()
  } catch (err: any) {
    showToast(err?.data?.statusMessage || 'Gagal menyimpan perubahan pesanan.')
  } finally {
    isSaving.value = false
  }
}

const paymentStatusMeta: Record<DbOrderStatus, { label: string; badgeClass: string; icon: any }> = {
  pending: {
    label: 'Menunggu Bayar',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: Clock,
  },
  paid: {
    label: 'Sudah Dibayar',
    badgeClass: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    icon: CheckCircle2,
  },
  shipped: {
    label: 'Sudah Dibayar',
    badgeClass: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    icon: CheckCircle2,
  },
  delivered: {
    label: 'Sudah Dibayar',
    badgeClass: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Dibatalkan / Gagal',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: XCircle,
  },
}

const shippingStatusMeta: Record<DbShippingStatus, { label: string; badgeClass: string; icon: any }> = {
  pending: {
    label: 'Menunggu Pengiriman',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: Clock,
  },
  packed: {
    label: 'Sedang Dikemas',
    badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
    icon: Package,
  },
  shipped: {
    label: 'Dalam Perjalanan',
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',
    icon: Truck,
  },
  delivered: {
    label: 'Sudah Sampai',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
  },
}

const currentShippingMeta = computed(() => {
  const key = normalizeShippingStatus(order.value?.statusPengiriman)
  return shippingStatusMeta[key]
})

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
</script>

<template>
  <div class="space-y-5">
    <div>
      <NuxtLink
        to="/admin/pesanan"
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
      >
        <ArrowLeft class="h-4 w-4" />
        <span>Kembali ke Daftar Pesanan</span>
      </NuxtLink>
    </div>

    <div
      v-if="isLoading && !order"
      class="rounded-2xl border border-slate-200 bg-white p-14 text-center text-sm font-semibold text-slate-500"
    >
      Memuat detail pesanan...
    </div>

    <div
      v-else-if="!order"
      class="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center"
    >
      <Package class="mx-auto h-10 w-10 text-slate-400" />
      <h2 class="mt-3 text-base font-bold text-slate-900">Pesanan tidak ditemukan</h2>
    </div>

    <template v-else>
      <!-- Header Invoice -->
      <div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div>
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Invoice Pesanan</span>
          <h1 class="mt-0.5 text-lg font-extrabold text-slate-900 sm:text-xl">{{ order.orderNumber }}</h1>
          <p class="mt-0.5 text-xs text-slate-500">
            {{ formatDate(order.createdAt) }}
            <span v-if="order.paymentMethod"> • Metode: <strong class="text-slate-700">{{ order.paymentMethod }}</strong></span>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <!-- Badge Status Pembayaran -->
          <span
            :class="[
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold',
              paymentStatusMeta[order.status].badgeClass,
            ]"
          >
            <component :is="paymentStatusMeta[order.status].icon" class="h-4 w-4" />
            <span>{{ paymentStatusMeta[order.status].label }}</span>
          </span>

          <!-- Badge Status Pengiriman -->
          <span
            :class="[
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold',
              currentShippingMeta.badgeClass,
            ]"
          >
            <component :is="currentShippingMeta.icon" class="h-4 w-4" />
            <span>{{ currentShippingMeta.label }}</span>
          </span>
        </div>
      </div>

      <!-- Form Kontrol Pengiriman Admin -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <h2 class="border-b border-slate-100 pb-3.5 text-sm font-extrabold text-slate-900">
          Update Status Pengiriman & Nomor Resi
        </h2>

        <form @submit.prevent="handleSaveOrder" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <!-- Status Pembayaran (Read-Only) -->
          <div>
            <label class="block text-xs font-bold text-slate-500">Status Pembayaran (Read-Only)</label>
            <input
              type="text"
              :value="paymentStatusMeta[order.status].label"
              readonly
              disabled
              class="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-600 sm:text-sm"
            />
          </div>

          <!-- Ekspedisi / Kurir (Read-Only) -->
          <div>
            <label class="block text-xs font-bold text-slate-500">Ekspedisi / Kurir (Read-Only)</label>
            <input
              type="text"
              :value="order.shippingCourier || '-'"
              readonly
              disabled
              class="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs font-semibold text-slate-600 sm:text-sm"
            />
          </div>

          <!-- Status Pengiriman (Editable Dropdown) -->
          <div>
            <label class="block text-xs font-bold text-slate-700">Status Pengiriman</label>
            <select
              v-model="editShippingStatus"
              class="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none sm:text-sm"
            >
              <option value="pending">Menunggu Pengiriman</option>
              <option value="packed">Sedang Dikemas</option>
              <option value="shipped">Dalam Perjalanan</option>
              <option value="delivered">Sudah Sampai</option>
            </select>
          </div>

          <!-- Catatan / Nomor Resi (Editable -> shippingNotes) -->
          <div>
            <label class="block text-xs font-bold text-slate-700">Catatan / Nomor Resi</label>
            <input
              v-model="editNotes"
              type="text"
              placeholder="Contoh: Resi JNE123456789"
              class="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-xs text-slate-900 focus:border-indigo-600 focus:outline-none sm:text-sm"
            />
          </div>

          <div class="flex justify-end sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              :disabled="isSaving"
              class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-60"
            >
              <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              <span>{{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan Pengiriman' }}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Informasi Pembeli & Alamat Tujuan -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <div class="flex items-start gap-3">
            <User class="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            <div>
              <h3 class="text-sm font-extrabold text-slate-900">Data Pelanggan</h3>
              <p class="mt-1 text-sm font-bold text-slate-800">{{ order.customerName }}</p>
              <p class="text-xs text-slate-500">{{ order.customerEmail }}</p>
              <p class="text-xs text-slate-500">{{ order.customerPhone }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <div class="flex items-start gap-3">
            <MapPin class="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            <div>
              <h3 class="text-sm font-extrabold text-slate-900">Alamat Pengiriman Pembeli</h3>
              <p class="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">{{ order.shippingAddress }}</p>
              <p v-if="order.shippingNotes" class="mt-1.5 text-xs font-medium text-indigo-600">
                Catatan / Resi: {{ order.shippingNotes }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Item Pesanan & Total -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <h2 class="border-b border-slate-100 pb-3.5 text-sm font-extrabold text-slate-900">
          Daftar Barang Dipesan ({{ order.items.length }} Item)
        </h2>

        <div class="divide-y divide-slate-100">
          <div
            v-for="item in order.items"
            :key="item.id"
            class="flex items-center justify-between gap-4 py-4"
          >
            <div class="flex min-w-0 items-center gap-3.5">
              <img
                :src="item.productImage"
                :alt="item.productName"
                style="width: 56px; height: 56px;"
                class="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover"
              />
              <div class="min-w-0">
                <p class="truncate text-sm font-bold text-slate-900">{{ item.productName }}</p>
                <p class="mt-0.5 text-xs text-slate-500">
                  {{ item.quantity }} x {{ formatRupiah(item.price) }}
                </p>
              </div>
            </div>

            <span class="shrink-0 text-sm font-extrabold text-slate-900">
              {{ formatRupiah(item.price * item.quantity) }}
            </span>
          </div>
        </div>

        <div class="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
          <div class="flex justify-between">
            <span>Subtotal Produk</span>
            <span class="font-semibold text-slate-900">{{ formatRupiah(order.subtotal) }}</span>
          </div>
          <div class="flex justify-between">
            <span>Ongkos Kirim ({{ order.shippingCourier }})</span>
            <span class="font-semibold text-slate-900">{{ formatRupiah(order.shippingCost) }}</span>
          </div>
          <div v-if="order.insuranceCost > 0" class="flex justify-between">
            <span>Asuransi Pengiriman</span>
            <span class="font-semibold text-slate-900">{{ formatRupiah(order.insuranceCost) }}</span>
          </div>
          <div v-if="order.discountAmount > 0" class="flex justify-between text-emerald-600">
            <span>Diskon</span>
            <span class="font-semibold">-{{ formatRupiah(order.discountAmount) }}</span>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <span class="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
            <CreditCard class="h-4 w-4 text-indigo-600" />
            <span>Total Dibayar Pembeli</span>
          </span>
          <span class="text-lg font-extrabold text-indigo-600">{{ formatRupiah(order.grandTotal) }}</span>
        </div>
      </div>
    </template>
  </div>
</template>