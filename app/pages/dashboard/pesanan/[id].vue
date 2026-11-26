<script setup lang="ts">
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  MapPin,
  CreditCard,
  Star,
  Clock,
  X,
  MessageSquare,
  Loader2,
  XCircle,
  Copy,
  ReceiptText,
} from 'lucide-vue-next'

type PaymentStatus = 'pending' | 'paid' | 'failed'
type ShippingStatus = 'pending' | 'packed' | 'shipped' | 'delivered'

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
  snapToken: string | null
  createdAt: string
  updatedAt?: string
  items: DbOrderItem[]
}

interface DbRating {
  id: number
  orderId: number
  productName: string
}

const route = useRoute()
const config = useRuntimeConfig()
const { formatRupiah, showToast } = useStore()
const { confirmDialog } = useConfirm()

const { data: ordersData, pending: isLoading, refresh } = await useFetch<DbOrder[]>('/api/orders', {
  default: () => [],
})

const { data: userRatings, refresh: refreshRatings } = await useFetch<DbRating[]>(
  '/api/user/ratings',
  { default: () => [] }
)

const order = computed(() =>
  (ordersData.value ?? []).find((o) => o.orderNumber === String(route.params.id))
)

// Normalisasi status pembayaran dari kolom `status`
const normalizedPayment = computed<PaymentStatus>(() => {
  const s = String(order.value?.status || 'pending').trim().toLowerCase()
  if (s === 'failed' || s === 'cancel' || s === 'cancelled' || s === 'gagal' || s === 'dibatalkan') {
    return 'failed'
  }
  if (s === 'paid' || s === 'settlement' || s === 'capture' || s === 'shipped' || s === 'delivered' || s === 'lunas') {
    return 'paid'
  }
  return 'pending'
})

// Normalisasi status pengiriman dari kolom `statusPengiriman` (fallback ke `status` jika data lama)
const normalizedShipping = computed<ShippingStatus>(() => {
  const rawShip = String(order.value?.statusPengiriman || '').trim().toLowerCase()
  const rawOrder = String(order.value?.status || '').trim().toLowerCase()
  const source = rawShip || rawOrder

  if (source === 'delivered' || source === 'sudah sampai' || source === 'sampai' || source === 'selesai') {
    return 'delivered'
  }
  if (source === 'shipped' || source === 'dikirim' || source === 'dalam perjalanan' || source === 'dalam pengiriman') {
    return 'shipped'
  }
  if (source === 'packed' || source === 'dikemas' || source === 'sedang dikemas') {
    return 'packed'
  }
  return 'pending'
})

const isPaying = ref(false)
const isConfirmingDelivered = ref(false)

// Cek item mana saja di order ini yang sudah dinilai di database
const ratedProductNames = computed(() => {
  const set = new Set<string>()
  if (!order.value) return set
  for (const r of userRatings.value ?? []) {
    if (r.orderId === order.value.id) {
      set.add(String(r.productName || '').trim().toLowerCase())
    }
  }
  return set
})

const isItemRated = (item: DbOrderItem) =>
  ratedProductNames.value.has(String(item.productName || '').trim().toLowerCase())

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

const paymentBadgeMeta: Record<PaymentStatus, { label: string; badgeClass: string; icon: any }> = {
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
  failed: {
    label: 'Pembayaran Gagal / Batal',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: XCircle,
  },
}

const shippingBadgeMeta: Record<
  ShippingStatus,
  { label: string; badgeClass: string; icon: any; step: number; description: string }
> = {
  pending: {
    label: 'Menunggu Pengiriman',
    badgeClass: 'border-slate-200 bg-slate-100 text-slate-700',
    icon: Clock,
    step: 1,
    description:
      'Pesanan menunggu verifikasi pembayaran & penjadwalan pengiriman oleh penjual.',
  },
  packed: {
    label: 'Sedang Dikemas',
    badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
    icon: Package,
    step: 2,
    description:
      'Pembayaran sudah diterima. Tim gudang sedang menyiapkan dan mengemas paketmu.',
  },
  shipped: {
    label: 'Dalam Perjalanan',
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',
    icon: Truck,
    step: 3,
    description:
      'Paket sudah diserahkan ke kurir ekspedisi dan sedang dalam perjalanan ke alamatmu.',
  },
  delivered: {
    label: 'Sudah Sampai',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
    step: 4,
    description:
      'Pesanan telah sampai di alamat tujuan. Kamu sekarang bisa memberikan penilaian produk.',
  },
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const copyShippingNotes = () => {
  if (!order.value?.shippingNotes) return
  navigator.clipboard?.writeText(order.value.shippingNotes)
  showToast('Nomor resi / catatan pengiriman disalin!')
}

// Timeline status jelas berdasarkan kolom `status` (pembayaran) dan `statusPengiriman` (pengiriman)
const trackingLogs = computed(() => {
  if (!order.value) return []
  const current = order.value
  const pay = normalizedPayment.value
  const ship = normalizedShipping.value

  const isPaid = pay === 'paid'
  const isPackedOrMore = ['packed', 'shipped', 'delivered'].includes(ship)
  const isShippedOrMore = ['shipped', 'delivered'].includes(ship)
  const isDelivered = ship === 'delivered'

  const items = [
    {
      title: '1. Pesanan Dibuat',
      desc: `Invoice ${current.orderNumber} berhasil dibuat.`,
      badge: formatDate(current.createdAt),
      done: true,
    },
    {
      title: pay === 'failed' ? '2. Pembayaran Gagal / Dibatalkan' : '2. Status Pembayaran',
      desc: isPaid
        ? `Pembayaran telah lunas melalui ${current.paymentMethod || 'Midtrans'}.`
        : pay === 'failed'
          ? 'Transaksi dibatalkan atau melewati batas waktu pembayaran.'
          : 'Menunggu kamu menyelesaikan pembayaran agar pesanan diproses.',
      badge: isPaid ? 'Lunas' : pay === 'failed' ? 'Gagal' : 'Belum Bayar',
      done: isPaid,
    },
    {
      title: '3. Pengemasan oleh Penjual',
      desc: isPackedOrMore
        ? 'Pesanan telah dikemas dan siap diserahkan ke pihak ekspedisi.'
        : isPaid
          ? 'Penjual akan segera memproses dan mengemas pesananmu.'
          : 'Menunggu pembayaran selesai.',
      badge: isPackedOrMore ? 'Selesai Dikemas' : isPaid ? 'Antrean Gudang' : 'Menunggu',
      done: isPackedOrMore,
    },
    {
      title: `4. Pengiriman (${current.shippingCourier || 'Kurir'})`,
      desc: isShippedOrMore
        ? current.shippingNotes
          ? `Paket dikirim dengan keterangan/resi: ${current.shippingNotes}`
          : 'Paket sedang dibawa oleh kurir menuju alamat penerima.'
        : 'Nomor resi akan tampil di sini setelah paket dikirim oleh penjual.',
      badge: isDelivered ? 'Terkirim' : ship === 'shipped' ? 'Dalam Perjalanan' : 'Belum Dikirim',
      done: isShippedOrMore,
    },
    {
      title: '5. Pesanan Sudah Sampai',
      desc: isDelivered
        ? 'Paket telah sampai di tujuan. Terima kasih telah berbelanja!'
        : 'Konfirmasi setelah paket kamu terima di alamat tujuan.',
      badge: isDelivered ? 'Sudah Sampai' : 'Menunggu Tiba',
      done: isDelivered,
    },
  ]

  return items.reverse()
})

// Buka popup Midtrans langsung dari halaman detail pesanan
const handlePayNow = async () => {
  if (!order.value) return
  const current = order.value
  isPaying.value = true

  try {
    const snapInstance = await ensureMidtransSnap()
    let token = current.snapToken

    if (!token) {
      const res = await $fetch<{ token: string }>('/api/payment/midtrans', {
        method: 'POST',
        body: {
          orderId: current.orderNumber,
          grossAmount: current.grandTotal,
          customer: {
            fullName: current.customerName,
            email: current.customerEmail,
            phone: current.customerPhone,
            address: current.shippingAddress,
            city: '',
          },
          items: current.items.map((i) => ({
            id: i.productId ?? i.id,
            name: i.productName,
            price: i.price,
            quantity: i.quantity,
          })),
          shippingCost: current.shippingCost,
          insuranceCost: current.insuranceCost,
          discountAmount: current.discountAmount,
        },
      })
      token = res.token

      await $fetch('/api/orders', {
        method: 'POST',
        body: { orderNumber: current.orderNumber, snapToken: token },
      })
    }

    snapInstance.pay(token, {
      onSuccess: async (result: any) => {
        const method = result?.payment_type?.replace(/_/g, ' ').toUpperCase() || 'MIDTRANS'
        await $fetch('/api/orders', {
          method: 'POST',
          body: {
            orderNumber: current.orderNumber,
            status: 'paid',
            paymentMethod: method,
          },
        })
        showToast(`Pembayaran ${current.orderNumber} berhasil!`)
        await refresh()
      },
      onPending: async (result: any) => {
        const method = result?.payment_type?.replace(/_/g, ' ').toUpperCase() || 'MIDTRANS'
        await $fetch('/api/orders', {
          method: 'POST',
          body: {
            orderNumber: current.orderNumber,
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
    isPaying.value = false
  }
}

// Konfirmasi pesanan sudah sampai -> update kolom statusPengiriman ke 'delivered'
const confirmOrderDelivered = async () => {
  if (!order.value) return

  const ok = await confirmDialog({
    title: 'Konfirmasi Pesanan Sudah Sampai?',
    description: `Pastikan paket untuk pesanan ${order.value.orderNumber} sudah kamu terima dengan baik.`,
    confirmText: 'Ya, Sudah Sampai',
    cancelText: 'Belum',
    variant: 'primary',
  })
  if (!ok) return

  isConfirmingDelivered.value = true
  try {
    await $fetch('/api/orders', {
      method: 'POST',
      body: {
        orderNumber: order.value.orderNumber,
        statusPengiriman: 'delivered',
      },
    })
    showToast(`Pesanan ${order.value.orderNumber} dikonfirmasi sudah sampai!`)
    await refresh()
  } catch (err: any) {
    showToast(err?.data?.statusMessage || 'Gagal mengonfirmasi pesanan.')
  } finally {
    isConfirmingDelivered.value = false
  }
}

// Modal Rating langsung dari Detail Pesanan (simpan ke DB POST /api/user/ratings)
const ratingModal = ref<{ open: boolean; item: DbOrderItem | null }>({
  open: false,
  item: null,
})
const selectedStars = ref(5)
const reviewComment = ref('')
const isSubmittingReview = ref(false)

const openRatingModal = (item: DbOrderItem) => {
  ratingModal.value = { open: true, item }
  selectedStars.value = 5
  reviewComment.value = ''
}

const handleSaveReview = async () => {
  if (!order.value || !ratingModal.value.item) return
  const item = ratingModal.value.item

  isSubmittingReview.value = true
  try {
    await $fetch('/api/user/ratings', {
      method: 'POST',
      body: {
        orderId: order.value.id,
        orderNumber: order.value.orderNumber,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        rating: selectedStars.value,
        comment:
          reviewComment.value.trim() ||
          'Produk original, kualitas mantap dan sesuai pesanan!',
      },
    })

    await refreshRatings()
    ratingModal.value.open = false
    showToast('Terima kasih! Penilaian produk berhasil dikirim.')
  } catch (err: any) {
    showToast(err?.data?.statusMessage || 'Gagal menyimpan penilaian.')
  } finally {
    isSubmittingReview.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Bar Navigasi Kembali -->
    <div class="flex items-center justify-between">
      <NuxtLink
        to="/dashboard/pesanan"
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
      >
        <ArrowLeft class="h-4 w-4" />
        <span>Kembali ke Daftar Pesanan</span>
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4">
      <div class="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div class="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>

    <!-- Jika ID Pesanan Tidak Ditemukan -->
    <div
      v-else-if="!order"
      class="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center"
    >
      <Package class="mx-auto h-10 w-10 text-slate-400" />
      <h2 class="mt-3 text-base font-bold text-slate-900">Data pesanan tidak ditemukan</h2>
      <p class="mt-1 text-xs text-slate-500">Nomor invoice tidak tersedia di database.</p>
      <NuxtLink
        to="/dashboard/pesanan"
        class="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
      >
        Lihat Semua Pesanan
      </NuxtLink>
    </div>

    <!-- Konten Detail Pesanan -->
    <template v-else>
      <!-- 1. Kartu Header Status Pembayaran & Pengiriman -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Nomor Invoice</span>
            <h1 class="mt-0.5 text-lg font-extrabold text-slate-900 sm:text-xl">{{ order.orderNumber }}</h1>
            <p class="mt-0.5 text-xs text-slate-500">Tanggal Pemesanan: {{ formatDate(order.createdAt) }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Badge Status Pembayaran -->
            <span
              :class="[
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold',
                paymentBadgeMeta[normalizedPayment].badgeClass,
              ]"
            >
              <component :is="paymentBadgeMeta[normalizedPayment].icon" class="h-3.5 w-3.5" />
              <span>{{ paymentBadgeMeta[normalizedPayment].label }}</span>
            </span>

            <!-- Badge Status Pengiriman (dari statusPengiriman) -->
            <span
              :class="[
                'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold',
                shippingBadgeMeta[normalizedShipping].badgeClass,
              ]"
            >
              <component :is="shippingBadgeMeta[normalizedShipping].icon" class="h-4 w-4" />
              <span>{{ shippingBadgeMeta[normalizedShipping].label }}</span>
            </span>
          </div>
        </div>

        <!-- Progress Bar Pengiriman -->
        <div class="pt-4">
          <div class="mb-2.5 flex items-center gap-2">
            <div
              v-for="step in 4"
              :key="step"
              :class="[
                'h-2 flex-1 rounded-full transition-colors',
                step <= shippingBadgeMeta[normalizedShipping].step ? 'bg-indigo-600' : 'bg-slate-200',
              ]"
            />
          </div>
          <p class="text-xs font-medium text-slate-600">
            {{ shippingBadgeMeta[normalizedShipping].description }}
          </p>

          <!-- Tombol Bayar Sekarang jika pembayaran masih pending -->
          <div
            v-if="normalizedPayment === 'pending'"
            class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4"
          >
            <div>
              <p class="text-xs font-extrabold text-amber-900">Tagihan Belum Dibayar</p>
              <p class="text-xs text-amber-700">
                Total: <span class="font-extrabold">{{ formatRupiah(order.grandTotal) }}</span>
              </p>
            </div>

            <button
              type="button"
              :disabled="isPaying"
              @click="handlePayNow"
              class="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-amber-600 disabled:bg-slate-400"
            >
              <Loader2 v-if="isPaying" class="h-4 w-4 animate-spin" />
              <CreditCard v-else class="h-4 w-4" />
              <span>{{ isPaying ? 'Membuka Midtrans...' : `Bayar Sekarang • ${formatRupiah(order.grandTotal)}` }}</span>
            </button>
          </div>

          <!-- Tombol Konfirmasi Sampai jika statusPengiriman sudah 'shipped' -->
          <div v-if="normalizedShipping === 'shipped'" class="mt-4">
            <button
              type="button"
              :disabled="isConfirmingDelivered"
              @click="confirmOrderDelivered"
              class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <Loader2 v-if="isConfirmingDelivered" class="h-4 w-4 animate-spin" />
              <CheckCircle2 v-else class="h-4 w-4" />
              <span>{{ isConfirmingDelivered ? 'Memproses...' : 'Konfirmasi Pesanan Sudah Sampai' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Info Pengiriman, Nomor Resi & Timeline -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
          <div class="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Truck class="h-4 w-4 text-indigo-600" />
            <span>Informasi Pengiriman & Resi</span>
          </div>

          <span class="text-xs font-bold text-indigo-600">
            {{ shippingBadgeMeta[normalizedShipping].label }}
          </span>
        </div>

        <div class="mt-4 space-y-3 text-xs text-slate-600">
          <div class="flex flex-wrap justify-between gap-2">
            <span class="text-slate-500">Kurir Ekspedisi</span>
            <span class="font-bold text-slate-900">{{ order.shippingCourier }}</span>
          </div>

          <!-- Kotak Nomor Resi / Catatan Pengiriman (shippingNotes) -->
          <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <div class="flex items-center gap-2">
              <ReceiptText class="h-4 w-4 shrink-0 text-indigo-600" />
              <div>
                <span class="block text-[11px] font-semibold text-slate-500">Nomor Resi / Catatan Pengiriman</span>
                <span
                  :class="[
                    'font-mono text-xs font-extrabold',
                    order.shippingNotes ? 'text-slate-900' : 'font-sans font-normal italic text-slate-400',
                  ]"
                >
                  {{ order.shippingNotes || 'Belum ada nomor resi yang diinput penjual' }}
                </span>
              </div>
            </div>

            <button
              v-if="order.shippingNotes"
              type="button"
              @click="copyShippingNotes"
              class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600"
            >
              <Copy class="h-3.5 w-3.5" />
              <span>Salin</span>
            </button>
          </div>

          <div class="flex items-start gap-2.5 border-t border-slate-100 pt-3">
            <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div>
              <span class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Alamat Penerima
              </span>
              <p class="mt-0.5 font-bold text-slate-900">
                {{ order.customerName }} • {{ order.customerPhone }}
              </p>
              <p class="mt-0.5 leading-relaxed text-slate-600">{{ order.shippingAddress }}</p>
            </div>
          </div>
        </div>

        <!-- Timeline Riwayat Status Pesanan -->
        <div class="mt-5 border-t border-slate-100 pt-4">
          <div class="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Clock class="h-3.5 w-3.5 text-indigo-600" />
            <span>Riwayat Status Pesanan</span>
          </div>

          <div class="ml-2 space-y-4 border-l-2 border-slate-200 pl-4">
            <div v-for="(log, idx) in trackingLogs" :key="idx" class="relative">
              <span
                :class="[
                  'absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-white',
                  log.done ? 'bg-indigo-600 ring-2 ring-indigo-100' : 'bg-slate-300',
                ]"
              />
              <div class="flex flex-wrap items-center justify-between gap-1">
                <p :class="['text-xs font-bold', log.done ? 'text-slate-900' : 'text-slate-400']">
                  {{ log.title }}
                </p>
                <span
                  :class="[
                    'rounded-md px-2 py-0.5 text-[11px] font-semibold',
                    log.done ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400',
                  ]"
                >
                  {{ log.badge }}
                </span>
              </div>
              <p :class="['mt-0.5 text-xs leading-relaxed', log.done ? 'text-slate-600' : 'text-slate-400']">
                {{ log.desc }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Daftar Produk dalam Pesanan Ini -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <h2 class="border-b border-slate-100 pb-3.5 text-sm font-extrabold text-slate-900">
          Produk dalam Pesanan ({{ order.items.length }} Item)
        </h2>

        <div class="divide-y divide-slate-100">
          <div
            v-for="item in order.items"
            :key="item.id"
            class="flex flex-col justify-between gap-4 py-4 first:pt-4 last:pb-0 sm:flex-row sm:items-center"
          >
            <div class="flex items-center gap-4">
              <img
                :src="item.productImage"
                :alt="item.productName"
                style="width: 64px; height: 64px;"
                class="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover"
              />
              <div>
                <p class="text-sm font-bold text-slate-900">{{ item.productName }}</p>
                <p class="mt-1 text-xs font-semibold text-slate-700">
                  {{ item.quantity }} x {{ formatRupiah(item.price) }}
                </p>
              </div>
            </div>

            <div class="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
              <span class="text-sm font-extrabold text-slate-900">
                {{ formatRupiah(item.price * item.quantity) }}
              </span>

              <!-- Tombol Beri Rating muncul saat statusPengiriman sudah 'delivered' (Sudah Sampai) -->
              <template v-if="normalizedShipping === 'delivered'">
                <button
                  v-if="!isItemRated(item)"
                  type="button"
                  @click="openRatingModal(item)"
                  class="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
                >
                  <Star class="h-3.5 w-3.5 fill-white" />
                  <span>Beri Rating</span>
                </button>
                <span
                  v-else
                  class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                >
                  <CheckCircle2 class="h-3.5 w-3.5" />
                  <span>Sudah Dinilai</span>
                </span>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Rincian Pembayaran Transaksi -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div class="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <CreditCard class="h-4 w-4 text-indigo-600" />
            <span>Rincian Pembayaran</span>
          </div>

          <button
            v-if="normalizedPayment === 'pending'"
            type="button"
            :disabled="isPaying"
            @click="handlePayNow"
            class="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-amber-600 disabled:bg-slate-400"
          >
            <Loader2 v-if="isPaying" class="h-3.5 w-3.5 animate-spin" />
            <CreditCard v-else class="h-3.5 w-3.5" />
            <span>{{ isPaying ? 'Memuat...' : 'Bayar Sekarang' }}</span>
          </button>
        </div>

        <div class="mt-4 space-y-2.5 text-xs">
          <div class="flex justify-between text-slate-600">
            <span>Status Pembayaran</span>
            <span class="font-bold text-slate-900">{{ paymentBadgeMeta[normalizedPayment].label }}</span>
          </div>
          <div class="flex justify-between text-slate-600">
            <span>Metode Pembayaran</span>
            <span class="font-bold text-slate-900">{{ order.paymentMethod || 'Midtrans Snap' }}</span>
          </div>
          <div class="flex justify-between text-slate-600">
            <span>Subtotal Harga Produk</span>
            <span class="font-semibold text-slate-900">{{ formatRupiah(order.subtotal) }}</span>
          </div>
          <div class="flex justify-between text-slate-600">
            <span>Ongkos Kirim ({{ order.shippingCourier }})</span>
            <span class="font-semibold text-slate-900">{{ formatRupiah(order.shippingCost) }}</span>
          </div>
          <div v-if="order.insuranceCost > 0" class="flex justify-between text-slate-600">
            <span>Asuransi Pengiriman</span>
            <span class="font-semibold text-slate-900">{{ formatRupiah(order.insuranceCost) }}</span>
          </div>
          <div v-if="order.discountAmount > 0" class="flex justify-between font-semibold text-emerald-600">
            <span>Diskon Promo</span>
            <span>-{{ formatRupiah(order.discountAmount) }}</span>
          </div>
          <div class="flex justify-between border-t border-slate-100 pt-3 text-base font-extrabold text-slate-900">
            <span>Total Pembayaran</span>
            <span class="text-indigo-600">{{ formatRupiah(order.grandTotal) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal Rating -->
    <div
      v-if="ratingModal.open && ratingModal.item && order"
      @click.self="ratingModal.open = false"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-2 font-extrabold text-slate-900">
            <MessageSquare class="h-5 w-5 text-indigo-600" />
            <span>Beri Rating Produk</span>
          </div>
          <button
            type="button"
            @click="ratingModal.open = false"
            class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
          <img
            :src="ratingModal.item.productImage"
            :alt="ratingModal.item.productName"
            style="width: 56px; height: 56px;"
            class="h-14 w-14 shrink-0 rounded-xl object-cover"
          />
          <div>
            <p class="text-sm font-bold text-slate-900">{{ ratingModal.item.productName }}</p>
            <p class="text-xs text-slate-500">Order: {{ order.orderNumber }}</p>
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
            type="button"
            @click="ratingModal.open = false"
            :disabled="isSubmittingReview"
            class="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            @click="handleSaveReview"
            :disabled="isSubmittingReview"
            class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Loader2 v-if="isSubmittingReview" class="h-4 w-4 animate-spin" />
            <span>{{ isSubmittingReview ? 'Mengirim...' : 'Kirim Rating' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>