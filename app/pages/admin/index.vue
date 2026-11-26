<script setup lang="ts">
import {
  Wallet,
  Package,
  ShoppingBag,
  Users,
  Plus,
  ArrowRight,
  AlertTriangle,
} from 'lucide-vue-next'

const { formatRupiah } = useStore()

const { data: rawProducts } = await useFetch<any[]>('/api/admin/products', { default: () => [] })
const { data: rawOrders } = await useFetch<any[]>('/api/orders/admin', { default: () => [] })
const { data: rawUsers } = await useFetch<any[]>('/api/admin/users', { default: () => [] })

const products = computed(() => (Array.isArray(rawProducts.value) ? rawProducts.value : []))
const orders = computed(() => (Array.isArray(rawOrders.value) ? rawOrders.value : []))
const managedUsers = computed(() => (Array.isArray(rawUsers.value) ? rawUsers.value : []))

const validOrders = computed(() =>
  orders.value.filter(
    (item) => !['cancel', 'cancelled', 'failed'].includes(String(item.status || '').toLowerCase())
  )
)

const totalRevenue = computed(() =>
  validOrders.value.reduce((sum, item) => {
    const rawAmount = item.grandTotal ?? item.subtotal ?? item.total ?? 0
    const numericAmount = Number(String(rawAmount).replace(/[^0-9.-]+/g, ''))
    return sum + (Number.isFinite(numericAmount) ? numericAmount : 0)
  }, 0)
)

const COMPLETED_SHIPPING_STATUSES = ['delivered', 'sudah sampai', 'sampai', 'selesai']
const CANCELLED_ORDER_STATUSES = ['cancel', 'cancelled', 'failed']
const ACTIVE_ORDER_STATUSES = ['pending', 'paid', 'packed', 'shipped', 'shipping']

const isOrderCompleted = (order: any) => {
  const shipStatus = String(order?.statusPengiriman || '').trim().toLowerCase()
  const orderStatus = String(order?.status || '').trim().toLowerCase()
  return COMPLETED_SHIPPING_STATUSES.includes(shipStatus) || ['delivered', 'completed', 'selesai'].includes(orderStatus)
}

const activeOrdersCount = computed(() =>
  orders.value.filter((o) => {
    const orderStatus = String(o?.status || '').trim().toLowerCase()
    if (CANCELLED_ORDER_STATUSES.includes(orderStatus)) return false
    if (isOrderCompleted(o)) return false
    return ACTIVE_ORDER_STATUSES.includes(orderStatus)
  }).length
)

const lowStockProducts = computed(() =>
  [...products.value].sort((a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0)).slice(0, 4)
)

const recentOrders = computed(() => orders.value.slice(0, 4))

const statusBadge: Record<string, { text: string; cls: string }> = {
  pending: {
    text: 'Menunggu bayar',
    cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-300',
  },
  paid: {
    text: 'Sudah dibayar',
    cls: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/50 dark:text-indigo-300',
  },
  packed: {
    text: 'Sudah di-packing',
    cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-300',
  },
  shipped: {
    text: 'Dalam perjalanan',
    cls: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-950/50 dark:text-sky-300',
  },
  shipping: {
    text: 'Dalam perjalanan',
    cls: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-950/50 dark:text-sky-300',
  },
  delivered: {
    text: 'Sudah sampai',
    cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  cancel: {
    text: 'Dibatalkan',
    cls: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-300',
  },
  cancelled: {
    text: 'Dibatalkan',
    cls: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-300',
  },
  failed: {
    text: 'Dibatalkan',
    cls: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-300',
  },
}

const getBadge = (status: string) =>
  statusBadge[String(status || '').toLowerCase()] ?? {
    text: status || 'Pending',
    cls: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  }
</script>

<template>
  <div class="space-y-6">
    <!-- Header Ringkasan -->
    <div class="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:p-6">
      <div>
        <h1 class="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">Ringkasan Toko</h1>
        <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
          Pantau performa penjualan, stok produk, pesanan masuk, dan pengguna aktif.
        </p>
      </div>

      <NuxtLink
        to="/admin/produk/tambah"
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 sm:text-sm"
      >
        <Plus class="h-4 w-4" />
        <span>Tambah Produk</span>
      </NuxtLink>
    </div>

    <!-- 4 Kartu Statistik -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Pendapatan</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Wallet class="h-4 w-4" />
          </div>
        </div>
        <p class="mt-3 text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">
          {{ formatRupiah(totalRevenue) }}
        </p>
        <p class="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          Dari {{ validOrders.length }} transaksi aktif ({{ orders.length }} total)
        </p>
      </div>

      <NuxtLink
        to="/admin/produk"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Produk</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Package class="h-4 w-4" />
          </div>
        </div>
        <p class="mt-3 text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">{{ products.length }}</p>
        <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Tersedia di katalog</p>
      </NuxtLink>

      <NuxtLink
        to="/admin/pesanan"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-amber-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-500/40"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Pesanan Diproses</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <ShoppingBag class="h-4 w-4" />
          </div>
        </div>
        <p class="mt-3 text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">{{ activeOrdersCount }}</p>
        <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Menunggu bayar, packing & pengiriman</p>
      </NuxtLink>

      <NuxtLink
        to="/admin/user"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-sky-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/40"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Pengguna</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
            <Users class="h-4 w-4" />
          </div>
        </div>
        <p class="mt-3 text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">{{ managedUsers.length }}</p>
        <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Akun terdaftar</p>
      </NuxtLink>
    </div>

    <!-- Grid Bawah: Pesanan Terbaru & Pantauan Stok -->
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <!-- Pesanan Terbaru -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-6 xl:col-span-7">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <h2 class="text-base font-extrabold text-slate-900 dark:text-white">Pesanan Masuk Terbaru</h2>
          <NuxtLink
            to="/admin/pesanan"
            class="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            <span>Kelola</span>
            <ArrowRight class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>

        <div class="divide-y divide-slate-100 dark:divide-slate-800">
          <NuxtLink
            v-for="order in recentOrders"
            :key="order.orderNumber || order.id"
            :to="`/admin/pesanan/${order.orderNumber || order.id}`"
            class="flex flex-col justify-between gap-2.5 py-3.5 transition hover:bg-slate-50/70 dark:hover:bg-slate-800/50 sm:flex-row sm:items-center"
          >
            <div class="min-w-0">
              <p class="text-sm font-bold text-slate-900 dark:text-white">{{ order.orderNumber || order.id }}</p>
              <p class="truncate text-xs text-slate-500 dark:text-slate-400">
                {{ order.items?.[0]?.productName || order.items?.[0]?.product?.name || order.customerName }}
                <span v-if="(order.items?.length ?? 0) > 1"> (+{{ order.items.length - 1 }} item)</span>
              </p>
            </div>

            <div class="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
              <span
                :class="[
                  'whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
                  getBadge(order.status).cls,
                ]"
              >
                {{ getBadge(order.status).text }}
              </span>
              <span class="text-xs font-extrabold text-slate-900 dark:text-white sm:text-sm">
                {{ formatRupiah(order.grandTotal ?? order.total ?? 0) }}
              </span>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Pantauan Stok Produk -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-6 xl:col-span-5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div class="flex items-center gap-2">
            <AlertTriangle class="h-4 w-4 text-amber-500" />
            <h2 class="text-base font-extrabold text-slate-900 dark:text-white">Pantauan Stok</h2>
          </div>
          <NuxtLink
            to="/admin/produk"
            class="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Semua Produk
          </NuxtLink>
        </div>

        <div class="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          <div
            v-for="item in lowStockProducts"
            :key="item.id"
            class="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-0"
          >
            <div class="flex min-w-0 items-center gap-3">
              <img
                :src="item.image"
                :alt="item.name"
                style="width: 40px; height: 40px;"
                class="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
              />
              <div class="min-w-0">
                <p class="truncate text-xs font-bold text-slate-900 dark:text-white">{{ item.name }}</p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">{{ item.category }}</p>
              </div>
            </div>

            <span
              :class="[
                'shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold',
                item.stock <= 10
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
              ]"
            >
              Sisa {{ item.stock }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>