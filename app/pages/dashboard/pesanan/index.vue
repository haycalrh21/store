<script setup lang="ts">
import {
  Package,
  Truck,
  CheckCircle2,
  ChevronRight,
  FileText,
  Clock,
  CreditCard,
  Loader2,
  XCircle,
  Ban,
  RefreshCw,
} from 'lucide-vue-next'

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
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingAddress: string
  shippingCourier: string
  subtotal: number
  shippingCost: number
  insuranceCost: number
  discountAmount: number
  grandTotal: number
  status: 'pending' | 'paid' | 'failed' | 'shipped' | 'delivered'
  statusPengiriman?: string
  paymentMethod: string | null
  snapToken: string | null
  createdAt: string
  items: DbOrderItem[]
}

const config = useRuntimeConfig()
const { formatRupiah, showToast } = useStore()
const { confirmDialog } = useConfirm()

const { data: ordersData, pending: isLoadingOrders, refresh } = await useFetch<DbOrder[]>('/api/orders')
const orders = computed(() => ordersData.value ?? [])

const selectedFilter = ref<'all' | 'pending' | 'paid' | 'shipped' | 'delivered' | 'failed'>('all')
const payingOrderNumber = ref<string | null>(null)
const cancellingOrderNumber = ref<string | null>(null)
const changingMethodOrderNumber = ref<string | null>(null)

// Muat script Midtrans Snap
const snapScriptUrl = computed(() =>
  config.public.midtransIsProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js'
)

useHead({
  script: [
    {
      src: snapScriptUrl.value,
      'data-client-key': config.public.midtransClientKey,
    },
  ],
})

const ensureMidtransSnap = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Browser tidak tersedia'))
    if ((window as any).snap) return resolve((window as any).snap)

    const existing = document.querySelector(`script[src="${snapScriptUrl.value}"]`) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).snap))
      existing.addEventListener('error', () => reject(new Error('Gagal memuat Midtrans Snap')))
      return
    }

    const script = document.createElement('script')
    script.src = snapScriptUrl.value
    script.setAttribute('data-client-key', String(config.public.midtransClientKey || ''))
    script.onload = () => resolve((window as any).snap)
    script.onerror = () => reject(new Error('Gagal memuat Midtrans Snap'))
    document.head.appendChild(script)
  })
}

const getEffectiveStatus = (order: DbOrder): DbOrder['status'] => {
  if (order.status === 'failed') return 'failed'
  if (order.status === 'pending') return 'pending'
  const ship = String(order.statusPengiriman || '').toLowerCase()
  if (ship === 'delivered' || order.status === 'delivered') return 'delivered'
  if (ship === 'shipped' || order.status === 'shipped') return 'shipped'
  return 'paid'
}

const statusMeta: Record<
  DbOrder['status'],
  { label: string; badgeClass: string; icon: any }
> = {
  pending: {
    label: 'Menunggu Pembayaran',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: Clock,
  },
  paid: {
    label: 'Sudah Dibayar',
    badgeClass: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    icon: CheckCircle2,
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
    id: 'shipped' as const,
    label: 'Dikirim',
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
  if (selectedFilter.value === 'all') return orders.value
  return orders.value.filter((o) => getEffectiveStatus(o) === selectedFilter.value)
})

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 1. Batalkan pesanan berstatus pending (stok dikembalikan, riwayat pesanan tetap tersimpan sebagai 'failed')
const handleCancelOrder = async (orderNumber: string) => {
  const isConfirmed = await confirmDialog({
    title: `Batalkan Pesanan ${orderNumber}?`,
    description:
      'Tagihan Midtrans akan dibatalkan, stok produk dikembalikan, dan status pesanan berubah menjadi Dibatalkan.',
    confirmText: 'Ya, Batalkan',
    cancelText: 'Kembali',
    variant: 'danger',
  })

  if (!isConfirmed) return

  cancellingOrderNumber.value = orderNumber
  try {
    await $fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, {
      method: 'DELETE',
    })
    showToast(`Pesanan ${orderNumber} berhasil dibatalkan & stok telah dikembalikan.`)
    await refresh()
  } catch (err: any) {
    showToast(err?.data?.statusMessage || err?.message || 'Gagal membatalkan pesanan.')
  } finally {
    cancellingOrderNumber.value = null
  }
}

// 2. Ganti metode pembayaran
const handleChangePaymentMethod = async (order: DbOrder) => {
  changingMethodOrderNumber.value = order.orderNumber
  try {
    const [snapInstance, { orderNumber: newOrderNumber, token }] = await Promise.all([
      ensureMidtransSnap(),
      $fetch<{ orderNumber: string; token: string }>(
        `/api/orders/${encodeURIComponent(order.orderNumber)}/change-payment`,
        { method: 'POST' }
      ),
    ])

    await refresh()

    snapInstance.pay(token, {
      onSuccess: async (result: any) => {
        const method = result?.payment_type?.replace(/_/g, ' ').toUpperCase() || 'MIDTRANS'
        await $fetch('/api/orders', {
          method: 'POST',
          body: {
            orderNumber: newOrderNumber,
            status: 'paid',
            paymentMethod: method,
          },
        })
        showToast(`Pembayaran ${newOrderNumber} berhasil!`)
        await refresh()
      },
      onPending: async (result: any) => {
        const method = result?.payment_type?.replace(/_/g, ' ').toUpperCase() || 'MIDTRANS'
        await $fetch('/api/orders', {
          method: 'POST',
          body: {
            orderNumber: newOrderNumber,
            status: 'pending',
            paymentMethod: method,
          },
        })
        showToast(`Metode pembayaran diperbarui ke ${method}.`)
        await refresh()
      },
      onError: () => {
        showToast('Pembayaran gagal diproses. Silakan coba lagi.')
      },
      onClose: () => {
        showToast('Popup ditutup. Silakan pilih metode pembayaran kapan saja.')
      },
    })
  } catch (err: any) {
    showToast(err?.data?.statusMessage || err?.message || 'Gagal mengganti metode pembayaran.')
  } finally {
    changingMethodOrderNumber.value = null
  }
}

// 3. Lanjutkan bayar dengan metode yang sudah dipilih sebelumnya
const handlePayNow = async (order: DbOrder) => {
  payingOrderNumber.value = order.orderNumber
  try {
    const snapInstance = await ensureMidtransSnap()
    let token = order.snapToken

    if (!token) {
      const res = await $fetch<{ token: string }>('/api/payment/midtrans', {
        method: 'POST',
        body: {
          orderId: order.orderNumber,
          grossAmount: order.grandTotal,
          customer: {
            fullName: order.customerName,
            email: order.customerEmail,
            phone: order.customerPhone,
            address: order.shippingAddress,
            city: '',
          },
          items: order.items.map((i) => ({
            id: i.productId ?? i.id,
            name: i.productName,
            price: i.price,
            quantity: i.quantity,
          })),
          shippingCost: order.shippingCost,
          insuranceCost: order.insuranceCost,
          discountAmount: order.discountAmount,
        },
      })
      token = res.token

      await $fetch('/api/orders', {
        method: 'POST',
        body: { orderNumber: order.orderNumber, snapToken: token },
      })
    }

    snapInstance.pay(token, {
      onSuccess: async (result: any) => {
        const method = result?.payment_type?.replace(/_/g, ' ').toUpperCase() || 'MIDTRANS'
        await $fetch('/api/orders', {
          method: 'POST',
          body: {
            orderNumber: order.orderNumber,
            status: 'paid',
            paymentMethod: method,
          },
        })
        showToast(`Pembayaran ${order.orderNumber} berhasil!`)
        await refresh()
      },
      onPending: async (result: any) => {
        const method = result?.payment_type?.replace(/_/g, ' ').toUpperCase() || 'MIDTRANS'
        await $fetch('/api/orders', {
          method: 'POST',
          body: {
            orderNumber: order.orderNumber,
            status: 'pending',
            paymentMethod: method,
          },
        })
        showToast('Instruksi pembayaran diperbarui.')
        await refresh()
      },
      onError: () => {
        showToast('Pembayaran gagal diproses. Silakan coba lagi.')
      },
      onClose: () => {
        showToast('Popup pembayaran ditutup.')
      },
    })
  } catch (err: any) {
    showToast(err?.data?.statusMessage || err?.message || 'Gagal membuka Midtrans.')
  } finally {
    payingOrderNumber.value = null
  }
}

const confirmOrderDelivered = async (orderNumber: string) => {
  await $fetch('/api/orders', {
    method: 'POST',
    body: { orderNumber, statusPengiriman: 'delivered' },
  })
  showToast(`Pesanan ${orderNumber} dikonfirmasi sudah sampai!`)
  await refresh()
}
</script>

<template>
  <div class="space-y-5">
    <!-- Filter Status Pesanan -->
    <div class="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xs">
      <button
        v-for="tab in filterTabs"
        :key="tab.id"
        @click="selectedFilter = tab.id"
        :class="[
          'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition sm:text-sm',
          selectedFilter === tab.id
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'text-slate-600 hover:bg-slate-100',
        ]"
      >
        <span>{{ tab.label }}</span>
        <span
          :class="[
            'rounded-full px-2 py-0.5 text-xs',
            selectedFilter === tab.id
              ? 'bg-indigo-500 text-white'
              : 'bg-slate-100 text-slate-700',
          ]"
        >
          {{ tab.count }}
        </span>
      </button>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isLoadingOrders" class="space-y-4">
      <div v-for="n in 3" :key="n" class="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredOrders.length === 0"
      class="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center"
    >
      <Package class="mx-auto h-10 w-10 text-slate-400" />
      <h3 class="mt-3 text-base font-bold text-slate-900">Belum ada pesanan pada status ini</h3>
      <NuxtLink
        to="/products"
        class="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
      >
        Belanja Produk Sekarang
      </NuxtLink>
    </div>

    <!-- Daftar Kartu Pesanan -->
    <div v-else class="space-y-4">
      <div
        v-for="order in filteredOrders"
        :key="order.orderNumber"
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-indigo-300"
      >
        <!-- Header Invoice -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
          <div class="flex flex-wrap items-center gap-2.5 text-xs">
            <NuxtLink
              :to="`/dashboard/pesanan/${order.orderNumber}`"
              class="font-extrabold text-slate-900 hover:text-indigo-600"
            >
              {{ order.orderNumber }}
            </NuxtLink>
            <span class="text-slate-300">•</span>
            <span class="text-slate-500">{{ formatDate(order.createdAt) }}</span>
            <template v-if="order.paymentMethod">
              <span class="text-slate-300">•</span>
              <span class="font-semibold text-slate-600">{{ order.paymentMethod }}</span>
            </template>
          </div>

          <span
            :class="[
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold',
              statusMeta[getEffectiveStatus(order)]?.badgeClass || statusMeta.pending.badgeClass,
            ]"
          >
            <component :is="statusMeta[getEffectiveStatus(order)]?.icon || Clock" class="h-3.5 w-3.5" />
            <span>{{ statusMeta[getEffectiveStatus(order)]?.label || order.status }}</span>
          </span>
        </div>

        <!-- Ringkasan Item Pesanan -->
        <NuxtLink
          :to="`/dashboard/pesanan/${order.orderNumber}`"
          class="block divide-y divide-slate-100 px-5 transition hover:bg-slate-50/50"
        >
          <div
            v-for="item in order.items"
            :key="item.id"
            class="flex items-center justify-between gap-4 py-4"
          >
            <div class="flex min-w-0 items-center gap-4">
              <img
                :src="item.productImage"
                :alt="item.productName"
                style="width: 64px; height: 64px;"
                class="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover"
              />
              <div class="min-w-0">
                <p class="truncate text-sm font-bold text-slate-900">
                  {{ item.productName }}
                </p>
                <p class="mt-0.5 text-xs text-slate-500">
                  {{ item.quantity }} barang x {{ formatRupiah(item.price) }}
                </p>
              </div>
            </div>

            <div class="hidden items-center gap-1 text-xs font-semibold text-slate-400 sm:flex">
              <span>{{ formatRupiah(item.price * item.quantity) }}</span>
              <ChevronRight class="h-4 w-4" />
            </div>
          </div>
        </NuxtLink>

        <!-- Footer Total & Tombol Aksi -->
        <div class="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5">
          <div>
            <span class="text-xs text-slate-500">Total Tagihan ({{ order.items.length }} Produk)</span>
            <p class="text-base font-extrabold text-slate-900">{{ formatRupiah(order.grandTotal) }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-2.5">
            <!-- Tombol Batalkan, Ganti Metode & Bayar Sekarang jika status masih pending -->
            <template v-if="order.status === 'pending'">
              <button
                type="button"
                :disabled="
                  cancellingOrderNumber === order.orderNumber ||
                  payingOrderNumber === order.orderNumber ||
                  changingMethodOrderNumber === order.orderNumber
                "
                @click="handleCancelOrder(order.orderNumber)"
                class="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
              >
                <Loader2 v-if="cancellingOrderNumber === order.orderNumber" class="h-3.5 w-3.5 animate-spin" />
                <Ban v-else class="h-3.5 w-3.5" />
                <span>{{ cancellingOrderNumber === order.orderNumber ? 'Membatalkan...' : 'Batalkan' }}</span>
              </button>

              <button
                type="button"
                :disabled="
                  changingMethodOrderNumber === order.orderNumber ||
                  payingOrderNumber === order.orderNumber ||
                  cancellingOrderNumber === order.orderNumber
                "
                @click="handleChangePaymentMethod(order)"
                class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <Loader2 v-if="changingMethodOrderNumber === order.orderNumber" class="h-3.5 w-3.5 animate-spin" />
                <RefreshCw v-else class="h-3.5 w-3.5" />
                <span>{{ changingMethodOrderNumber === order.orderNumber ? 'Memuat...' : 'Ganti Metode' }}</span>
              </button>

              <button
                type="button"
                :disabled="
                  payingOrderNumber === order.orderNumber ||
                  cancellingOrderNumber === order.orderNumber ||
                  changingMethodOrderNumber === order.orderNumber
                "
                @click="handlePayNow(order)"
                class="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-amber-600 disabled:bg-slate-400"
              >
                <Loader2 v-if="payingOrderNumber === order.orderNumber" class="h-3.5 w-3.5 animate-spin" />
                <CreditCard v-else class="h-3.5 w-3.5" />
                <span>{{ payingOrderNumber === order.orderNumber ? 'Membuka Midtrans...' : 'Bayar Sekarang' }}</span>
              </button>
            </template>

            <button
              v-if="getEffectiveStatus(order) === 'shipped'"
              type="button"
              @click="confirmOrderDelivered(order.orderNumber)"
              class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
            >
              Konfirmasi Sampai
            </button>

            <NuxtLink
              :to="`/dashboard/pesanan/${order.orderNumber}`"
              class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
            >
              <FileText class="h-3.5 w-3.5" />
              <span>Lihat Detail Pesanan</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>