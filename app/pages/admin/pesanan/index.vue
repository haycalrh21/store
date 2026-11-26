<script setup lang="ts">
import {
  Package,
  Truck,
  CheckCircle2,
  FileText,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next'

type DbOrderStatus = 'pending' | 'paid' | 'packed' | 'shipped' | 'delivered' | 'failed'

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
  status: string
  statusPengiriman?: string
  paymentMethod: string | null
  createdAt: string
  items: DbOrderItem[]
}

const { formatRupiah } = useStore()

const { data: ordersData, pending: isLoading } = await useFetch<DbOrder[]>(
  '/api/orders/admin',
  { default: () => [] }
)

const orders = computed(() => ordersData.value ?? [])
const selectedStatus = ref<'all' | DbOrderStatus>('all')

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(5)

const getEffectiveStatus = (order: DbOrder): DbOrderStatus => {
  const pay = String(order.status || '').trim().toLowerCase()
  if (pay === 'failed' || pay === 'cancel' || pay === 'cancelled') return 'failed'
  if (pay === 'pending') return 'pending'

  const ship = String(order.statusPengiriman || '').trim().toLowerCase()
  if (ship === 'delivered' || ship === 'sudah sampai' || pay === 'delivered') return 'delivered'
  if (ship === 'shipped' || ship === 'dalam perjalanan' || pay === 'shipped') return 'shipped'
  if (ship === 'packed' || ship === 'sedang dikemas') return 'packed'
  return 'paid'
}

const statusMeta: Record<
  DbOrderStatus,
  { label: string; badgeClass: string; icon: any }
> = {
  pending: {
    label: 'Menunggu Bayar',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: Clock,
  },
  paid: {
    label: 'Sudah Dibayar',
    badgeClass: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    icon: Package,
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
  failed: {
    label: 'Dibatalkan / Gagal',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: XCircle,
  },
}

const filterTabs = computed(() => [
  { id: 'all' as const, label: 'Semua', count: orders.value.length },
  {
    id: 'pending' as const,
    label: 'Belum Bayar',
    count: orders.value.filter((o) => getEffectiveStatus(o) === 'pending').length,
  },
  {
    id: 'paid' as const,
    label: 'Sudah Dibayar',
    count: orders.value.filter((o) => getEffectiveStatus(o) === 'paid').length,
  },
  {
    id: 'packed' as const,
    label: 'Dikemas',
    count: orders.value.filter((o) => getEffectiveStatus(o) === 'packed').length,
  },
  {
    id: 'shipped' as const,
    label: 'Dalam Perjalanan',
    count: orders.value.filter((o) => getEffectiveStatus(o) === 'shipped').length,
  },
  {
    id: 'delivered' as const,
    label: 'Sudah Sampai',
    count: orders.value.filter((o) => getEffectiveStatus(o) === 'delivered').length,
  },
  {
    id: 'failed' as const,
    label: 'Dibatalkan',
    count: orders.value.filter((o) => getEffectiveStatus(o) === 'failed').length,
  },
])

const filteredOrders = computed(() => {
  if (selectedStatus.value === 'all') return orders.value
  return orders.value.filter((o) => getEffectiveStatus(o) === selectedStatus.value)
})

// Reset ke halaman 1 setiap kali tab status atau jumlah per halaman berubah
watch([selectedStatus, itemsPerPage], () => {
  currentPage.value = 1
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredOrders.value.length / itemsPerPage.value))
)

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredOrders.value.slice(start, start + itemsPerPage.value)
})

const pageStartItem = computed(() =>
  filteredOrders.value.length === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1
)

const pageEndItem = computed(() =>
  Math.min(currentPage.value * itemsPerPage.value, filteredOrders.value.length)
)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <h1 class="text-xl font-extrabold text-slate-900">Kelola Pesanan</h1>
      <p class="mt-0.5 text-xs text-slate-500 sm:text-sm">
        Pantau status pengiriman paket dan rincian transaksi seluruh pelanggan.
      </p>
    </div>

    <!-- Filter Status -->
    <div class="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xs">
      <button
        v-for="tab in filterTabs"
        :key="tab.id"
        @click="selectedStatus = tab.id"
        :class="[
          'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition sm:text-sm',
          selectedStatus === tab.id
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'text-slate-600 hover:bg-slate-100',
        ]"
      >
        <span>{{ tab.label }}</span>
        <span
          :class="[
            'rounded-full px-2 py-0.5 text-xs',
            selectedStatus === tab.id
              ? 'bg-indigo-500 text-white'
              : 'bg-slate-100 text-slate-700',
          ]"
        >
          {{ tab.count }}
        </span>
      </button>
    </div>

    <!-- Loading -->
    <div
      v-if="isLoading && orders.length === 0"
      class="rounded-2xl border border-slate-200 bg-white p-14 text-center text-sm font-semibold text-slate-500"
    >
      Memuat daftar pesanan...
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredOrders.length === 0"
      class="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center"
    >
      <Package class="mx-auto h-10 w-10 text-slate-400" />
      <h3 class="mt-3 text-base font-bold text-slate-900">Belum ada pesanan pada status ini</h3>
    </div>

    <!-- Daftar Pesanan + Pagination -->
    <template v-else>
      <div class="space-y-4">
        <div
          v-for="order in paginatedOrders"
          :key="order.orderNumber"
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
        >
          <!-- Header Kartu -->
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
            <div class="flex flex-wrap items-center gap-2.5 text-xs">
              <span class="font-extrabold text-slate-900">{{ order.orderNumber }}</span>
              <span class="text-slate-300">•</span>
              <span class="font-semibold text-slate-700">{{ order.customerName }}</span>
              <span class="text-slate-300">•</span>
              <span class="text-slate-500">{{ formatDate(order.createdAt) }}</span>
              <template v-if="order.paymentMethod">
                <span class="text-slate-300">•</span>
                <span class="font-semibold text-indigo-600">{{ order.paymentMethod }}</span>
              </template>
            </div>

            <span
              :class="[
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold',
                statusMeta[getEffectiveStatus(order)].badgeClass,
              ]"
            >
              <component :is="statusMeta[getEffectiveStatus(order)].icon" class="h-3.5 w-3.5" />
              <span>{{ statusMeta[getEffectiveStatus(order)].label }}</span>
            </span>
          </div>

          <!-- Ringkasan Produk & Kurir -->
          <div class="flex flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center">
            <div class="flex items-center gap-3.5">
              <img
                v-if="order.items?.[0]?.productImage"
                :src="order.items[0].productImage"
                :alt="order.items[0].productName"
                style="width: 56px; height: 56px;"
                class="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover"
              />
              <div class="min-w-0">
                <p class="truncate text-sm font-bold text-slate-900">
                  {{ order.items?.[0]?.productName || 'Pesanan Produk' }}
                  <span v-if="(order.items?.length ?? 0) > 1" class="text-xs font-normal text-slate-500">
                    (+{{ order.items.length - 1 }} produk lainnya)
                  </span>
                </p>
                <p class="mt-0.5 text-xs text-slate-500">
                  {{ order.shippingCourier || 'Kurir Standar' }} • {{ order.customerPhone }}
                  <span v-if="order.shippingNotes" class="font-mono font-semibold text-indigo-600">
                    • Resi: {{ order.shippingNotes }}
                  </span>
                </p>
              </div>
            </div>

            <div class="text-left sm:text-right">
              <span class="block text-[11px] text-slate-400">Total Transaksi</span>
              <span class="text-base font-extrabold text-slate-900">{{ formatRupiah(order.grandTotal) }}</span>
            </div>
          </div>

          <!-- Footer Detail -->
          <div class="flex justify-end border-t border-slate-100 bg-slate-50/70 px-5 py-3.5">
            <NuxtLink
              :to="`/admin/pesanan/${order.orderNumber}`"
              class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
            >
              <FileText class="h-3.5 w-3.5" />
              <span>Detail Pesanan</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Kontrol Pagination -->
      <div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-xs">
        <div class="flex items-center gap-3 text-xs text-slate-500">
          <span>
            Menampilkan <strong class="text-slate-900">{{ pageStartItem }}–{{ pageEndItem }}</strong> dari
            <strong class="text-slate-900">{{ filteredOrders.length }}</strong> pesanan
          </span>

          <select
            v-model.number="itemsPerPage"
            class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 focus:border-indigo-600 focus:outline-none"
          >
            <option :value="5">5 / hal</option>
            <option :value="10">10 / hal</option>
            <option :value="20">20 / hal</option>
          </select>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            :disabled="currentPage <= 1"
            @click="currentPage--"
            class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft class="h-4 w-4" />
            <span>Prev</span>
          </button>

          <button
            v-for="page in totalPages"
            :key="page"
            type="button"
            @click="currentPage = page"
            :class="[
              'h-8 min-w-8 rounded-xl px-2.5 text-xs font-bold transition',
              page === currentPage
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
            ]"
          >
            {{ page }}
          </button>

          <button
            type="button"
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
            class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </template>
  </div>
</template>