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
const { data: rawOrders } = await useFetch<any[]>('/api/orders', { default: () => [] })
const { data: rawUsers } = await useFetch<any[]>('/api/admin/users', { default: () => [] })

const products = computed(() => (Array.isArray(rawProducts.value) ? rawProducts.value : []))
const orders = computed(() => (Array.isArray(rawOrders.value) ? rawOrders.value : []))
const managedUsers = computed(() => (Array.isArray(rawUsers.value) ? rawUsers.value : []))

const totalRevenue = computed(() =>
  orders.value.reduce((sum, item) => sum + Number(item.grandTotal ?? item.total ?? 0), 0)
)

const activeOrdersCount = computed(
  () => orders.value.filter((o) => o.status !== 'delivered').length
)

const lowStockProducts = computed(() =>
  [...products.value].sort((a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0)).slice(0, 4)
)

const recentOrders = computed(() => orders.value.slice(0, 4))

const statusBadge: Record<string, { text: string; cls: string }> = {
  pending: { text: 'Menunggu bayar', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  paid: { text: 'Sudah dibayar', cls: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
  packed: { text: 'Sudah di-packing', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  shipped: { text: 'Dalam perjalanan', cls: 'border-sky-200 bg-sky-50 text-sky-700' },
  shipping: { text: 'Dalam perjalanan', cls: 'border-sky-200 bg-sky-50 text-sky-700' },
  delivered: { text: 'Sudah sampai', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  failed: { text: 'Dibatalkan', cls: 'border-rose-200 bg-rose-50 text-rose-700' },
}

const getBadge = (status: string) =>
  statusBadge[status] ?? { text: status || 'Pending', cls: 'border-slate-200 bg-slate-50 text-slate-700' }
</script>

<template>
  <div class="space-y-6">
    <!-- Header Ringkasan -->
    <div class="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:p-6">
      <div>
        <h1 class="text-xl font-extrabold text-slate-900 sm:text-2xl">Ringkasan Toko</h1>
        <p class="mt-0.5 text-xs text-slate-500 sm:text-sm">
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
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500">Total Pendapatan</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Wallet class="h-4 w-4" />
          </div>
        </div>
        <p class="mt-3 text-lg font-extrabold text-slate-900 sm:text-xl">
          {{ formatRupiah(totalRevenue) }}
        </p>
        <p class="mt-1 text-[11px] font-medium text-emerald-600">Dari {{ orders.length }} transaksi</p>
      </div>

      <NuxtLink
        to="/admin/produk"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-300"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500">Total Produk</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Package class="h-4 w-4" />
          </div>
        </div>
        <p class="mt-3 text-lg font-extrabold text-slate-900 sm:text-xl">{{ products.length }}</p>
        <p class="mt-1 text-[11px] text-slate-500">Tersedia di katalog</p>
      </NuxtLink>

      <NuxtLink
        to="/admin/pesanan"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-amber-300"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500">Pesanan Diproses</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <ShoppingBag class="h-4 w-4" />
          </div>
        </div>
        <p class="mt-3 text-lg font-extrabold text-slate-900 sm:text-xl">{{ activeOrdersCount }}</p>
        <p class="mt-1 text-[11px] text-slate-500">Packing & dalam perjalanan</p>
      </NuxtLink>

      <NuxtLink
        to="/admin/user"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-sky-300"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500">Total Pengguna</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Users class="h-4 w-4" />
          </div>
        </div>
        <p class="mt-3 text-lg font-extrabold text-slate-900 sm:text-xl">{{ managedUsers.length }}</p>
        <p class="mt-1 text-[11px] text-slate-500">Akun terdaftar</p>
      </NuxtLink>
    </div>

    <!-- Grid Bawah: Pesanan Terbaru & Pantauan Stok -->
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <!-- Pesanan Terbaru -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 xl:col-span-7">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 class="text-base font-extrabold text-slate-900">Pesanan Masuk Terbaru</h2>
          <NuxtLink
            to="/admin/pesanan"
            class="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
          >
            <span>Kelola</span>
            <ArrowRight class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>

        <div class="divide-y divide-slate-100">
          <NuxtLink
            v-for="order in recentOrders"
            :key="order.orderNumber || order.id"
            :to="`/admin/pesanan/${order.orderNumber || order.id}`"
            class="flex flex-col justify-between gap-2.5 py-3.5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center"
          >
            <div class="min-w-0">
              <p class="text-sm font-bold text-slate-900">{{ order.orderNumber || order.id }}</p>
              <p class="truncate text-xs text-slate-500">
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
              <span class="text-xs font-extrabold text-slate-900 sm:text-sm">
                {{ formatRupiah(order.grandTotal ?? order.total ?? 0) }}
              </span>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Pantauan Stok Produk -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 xl:col-span-5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-2">
            <AlertTriangle class="h-4 w-4 text-amber-500" />
            <h2 class="text-base font-extrabold text-slate-900">Pantauan Stok</h2>
          </div>
          <NuxtLink
            to="/admin/produk"
            class="text-xs font-bold text-indigo-600 hover:underline"
          >
            Semua Produk
          </NuxtLink>
        </div>

        <div class="mt-3 divide-y divide-slate-100">
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
                class="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover"
              />
              <div class="min-w-0">
                <p class="truncate text-xs font-bold text-slate-900">{{ item.name }}</p>
                <p class="text-[11px] text-slate-500">{{ item.category }}</p>
              </div>
            </div>

            <span
              :class="[
                'shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold',
                item.stock <= 10 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700',
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