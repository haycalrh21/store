<script setup lang="ts">
import { Package, Truck, CheckCircle2, ArrowRight, MapPin, Phone, User } from 'lucide-vue-next'

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
  status: 'pending' | 'paid' | 'packed' | 'shipped' | 'shipping' | 'delivered' | 'failed'
  statusPengiriman?: 'pending' | 'packed' | 'shipped' | 'delivered' | string
  paymentMethod: string | null
  createdAt: string
  items: DbOrderItem[]
}

const { formatRupiah } = useStore()
const { user } = useUserSession()

// Ambil pesanan milik user yang sedang login
const { data: ordersData } = await useFetch<DbOrder[]>('/api/orders', {
  default: () => [],
})

// Ambil profil terbaru user dari API (jika tersedia) atau dari sesi
const { data: profileData } = await useFetch<any>('/api/user/profile', {
  default: () => null,
})

const currentUser = computed(() => profileData.value ?? (user.value as any) ?? null)
const orders = computed(() => ordersData.value ?? [])

// Gabungkan status pembayaran (`status`) & status pengiriman (`statusPengiriman`)
const getEffectiveStatus = (order: DbOrder) => {
  const payStatus = String(order.status || '').trim().toLowerCase()
  if (payStatus === 'failed' || payStatus === 'cancel' || payStatus === 'cancelled') {
    return 'failed'
  }
  if (payStatus === 'pending') {
    return 'pending'
  }

  const shipStatus = String(order.statusPengiriman || '').trim().toLowerCase()
  if (shipStatus === 'delivered' || shipStatus === 'sudah sampai' || payStatus === 'delivered') {
    return 'delivered'
  }
  if (shipStatus === 'shipped' || shipStatus === 'shipping' || shipStatus === 'dalam perjalanan' || payStatus === 'shipped') {
    return 'shipped'
  }
  if (shipStatus === 'packed' || shipStatus === 'sedang dikemas' || payStatus === 'packed' || payStatus === 'paid') {
    return 'packed'
  }

  return 'pending'
}

const packedCount = computed(
  () => orders.value.filter((o) => getEffectiveStatus(o) === 'packed').length
)
const shippingCount = computed(
  () => orders.value.filter((o) => getEffectiveStatus(o) === 'shipped').length
)
const deliveredCount = computed(
  () => orders.value.filter((o) => getEffectiveStatus(o) === 'delivered').length
)

const latestOrders = computed(() => orders.value.slice(0, 3))

const statusLabel: Record<string, { text: string; badge: string }> = {
  pending: { text: 'Menunggu bayar', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  packed: { text: 'Sudah di-packing', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  shipped: { text: 'Dalam perjalanan', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  delivered: { text: 'Sudah sampai', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { text: 'Dibatalkan', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
}

const getOrderBadge = (order: DbOrder) => {
  const key = getEffectiveStatus(order)
  return statusLabel[key] ?? { text: key, badge: 'bg-slate-50 text-slate-700 border-slate-200' }
}

// Ambil telepon & alamat dari profil user, atau fallback ke pesanan terakhir
const displayPhone = computed(
  () => currentUser.value?.phone || orders.value[0]?.customerPhone || 'Belum diatur'
)
const displayAddress = computed(
  () => currentUser.value?.address || orders.value[0]?.shippingAddress || 'Belum diatur'
)
</script>

<template>
  <div class="space-y-6">
    <!-- 3 Kartu Status Pengiriman Sejajar (dibaca dari statusPengiriman) -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <NuxtLink
        to="/dashboard/pesanan"
        class="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-amber-300"
      >
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Package class="h-6 w-6" />
        </div>
        <div class="min-w-0">
          <span class="block text-2xl font-extrabold text-slate-900">{{ packedCount }}</span>
          <span class="block whitespace-nowrap text-xs font-semibold text-slate-500">Sudah di-packing</span>
        </div>
      </NuxtLink>

      <NuxtLink
        to="/dashboard/pesanan"
        class="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-sky-300"
      >
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <Truck class="h-6 w-6" />
        </div>
        <div class="min-w-0">
          <span class="block text-2xl font-extrabold text-slate-900">{{ shippingCount }}</span>
          <span class="block whitespace-nowrap text-xs font-semibold text-slate-500">Dalam perjalanan</span>
        </div>
      </NuxtLink>

      <NuxtLink
        to="/dashboard/pesanan"
        class="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-emerald-300"
      >
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 class="h-6 w-6" />
        </div>
        <div class="min-w-0">
          <span class="block text-2xl font-extrabold text-slate-900">{{ deliveredCount }}</span>
          <span class="block whitespace-nowrap text-xs font-semibold text-slate-500">Sudah sampai</span>
        </div>
      </NuxtLink>
    </div>

    <!-- Pesanan Terbaru -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div class="flex items-center justify-between border-b border-slate-100 pb-4">
        <h2 class="text-base font-extrabold text-slate-900">Pesanan Terbaru</h2>
        <NuxtLink
          to="/dashboard/pesanan"
          class="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
        >
          <span>Lihat Semua</span>
          <ArrowRight class="h-3.5 w-3.5" />
        </NuxtLink>
      </div>

      <div v-if="latestOrders.length === 0" class="py-8 text-center text-xs text-slate-500">
        Belum ada riwayat pesanan.
      </div>

      <div v-else class="divide-y divide-slate-100">
        <NuxtLink
          v-for="order in latestOrders"
          :key="order.orderNumber"
          :to="`/dashboard/pesanan/${order.orderNumber}`"
          class="flex flex-col justify-between gap-3 py-4 transition hover:bg-slate-50/70 first:pt-4 last:pb-0 sm:flex-row sm:items-center"
        >
          <div class="flex min-w-0 items-center gap-3.5">
            <img
              v-if="order.items?.[0]?.productImage"
              :src="order.items[0].productImage"
              :alt="order.items[0].productName"
              style="width: 48px; height: 48px;"
              class="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover"
            />
            <div class="min-w-0">
              <p class="truncate text-sm font-bold text-slate-900">{{ order.orderNumber }}</p>
              <p class="truncate text-xs text-slate-500">
                {{ order.items?.[0]?.productName || 'Produk' }}
                <span v-if="(order.items?.length ?? 0) > 1"> (+{{ order.items.length - 1 }} produk lainnya)</span>
              </p>
            </div>
          </div>

          <div class="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
            <span
              :class="[
                'whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold',
                getOrderBadge(order).badge,
              ]"
            >
              {{ getOrderBadge(order).text }}
            </span>
            <span class="whitespace-nowrap text-sm font-extrabold text-slate-900">
              {{ formatRupiah(order.grandTotal) }}
            </span>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Ringkasan Alamat & Kontak -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div class="flex items-center justify-between border-b border-slate-100 pb-4">
        <h2 class="text-base font-extrabold text-slate-900">Alamat Pengiriman Utama</h2>
        <NuxtLink
          to="/dashboard/datadiri"
          class="text-xs font-bold text-indigo-600 hover:underline"
        >
          Ubah Data Diri
        </NuxtLink>
      </div>

      <div class="mt-4 space-y-2.5 text-sm text-slate-600">
        <p class="flex items-center gap-2.5">
          <User class="h-4 w-4 shrink-0 text-slate-400" />
          <span class="font-semibold text-slate-900">{{ currentUser?.name || 'Pelanggan' }}</span>
        </p>
        <p class="flex items-center gap-2.5">
          <Phone class="h-4 w-4 shrink-0 text-slate-400" />
          <span>{{ displayPhone }}</span>
        </p>
        <p class="flex items-start gap-2.5">
          <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span>{{ displayAddress }}</span>
        </p>
      </div>
    </div>
  </div>
</template>