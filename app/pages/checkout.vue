<script setup lang="ts">
import {
  MapPin,
  Truck,
  CreditCard,
  Check,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Sparkles,
  CheckCircle2,
  Package,
  Copy,
  ArrowLeft,
  Loader2,
  Search,
} from 'lucide-vue-next'

interface RajaOngkirDestination {
  id: number
  label: string
  province_name: string
  city_name: string
  district_name: string
  subdistrict_name: string
  zip_code: string
}

interface ShippingRateOption {
  id: string
  name: string
  eta: string
  price: number
  badge: string
}

interface UserProfileResponse {
  name?: string
  email?: string
  phone?: string
  city?: string
  address?: string
}

const { cart, cartTotal, clearCart, formatRupiah, showToast } = useStore()
const { user } = useUserSession()
const config = useRuntimeConfig()

// Konfigurasi Stepper
const steps = [
  { id: 1, title: 'Alamat Pengiriman', desc: 'Data penerima & tujuan', icon: MapPin },
  { id: 2, title: 'Metode Pengiriman', desc: 'Tarif asli dari Jakarta Timur', icon: Truck },
  { id: 3, title: 'Pembayaran', desc: 'Bayar instan via Midtrans', icon: CreditCard },
]

const currentStep = ref(1)
const isSubmitting = ref(false)
const isOrderSuccess = ref(false)
const orderNumber = ref('')

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


const { data: profileData } = await useFetch<UserProfileResponse | null>('/api/user/profile', {
  default: () => null,
})
// Pastikan window.snap benar-benar siap sebelum dipanggil
const ensureMidtransSnap = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Browser tidak tersedia'))
      return
    }
    if ((window as any).snap) {
      resolve((window as any).snap)
      return
    }

    const existing = document.querySelector(`script[src="${snapScriptUrl.value}"]`) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).snap))
      existing.addEventListener('error', () => reject(new Error('Gagal memuat script Midtrans Snap')))
      return
    }

    const script = document.createElement('script')
    script.src = snapScriptUrl.value
    script.setAttribute('data-client-key', String(config.public.midtransClientKey || ''))
    script.onload = () => resolve((window as any).snap)
    script.onerror = () => reject(new Error('Gagal memuat script Midtrans Snap'))
    document.head.appendChild(script)
  })
}

// Snapshot pesanan setelah pembayaran berhasil
const completedOrder = ref<{
  items: typeof cart.value
  subtotal: number
  shippingCost: number
  insuranceCost: number
  discountAmount: number
  grandTotal: number
  customerName: string
  phone: string
  fullAddress: string
  shippingName: string
  paymentName: string
} | null>(null)

// Form State Step 1: Alamat & Penerima
// Form State Step 1: Alamat & Penerima
const shippingForm = reactive({
  fullName: profileData.value?.name || user.value?.name || '',
  email: profileData.value?.email || user.value?.email || '',
  phone: profileData.value?.phone || '',
  destinationId: null as number | null,
  destinationLabel: '',
  city: '',
  postalCode: '',
  address: profileData.value?.address || '',
  notes: '',
})

watch(
  [() => profileData.value, () => user.value],
  ([profile, u]) => {
    const sourceName = profile?.name || u?.name
    const sourceEmail = profile?.email || u?.email
    if (!shippingForm.fullName && sourceName) shippingForm.fullName = sourceName
    if (!shippingForm.email && sourceEmail) shippingForm.email = sourceEmail
    if (!shippingForm.phone && profile?.phone) shippingForm.phone = profile.phone
    if (!shippingForm.address && profile?.address) shippingForm.address = profile.address
  },
  { immediate: true }
)
// Autocomplete Pencarian Tujuan RajaOngkir
const destinationKeyword = ref('')
const destinationResults = ref<RajaOngkirDestination[]>([])
const isSearchingDestination = ref(false)
const showDestinationDropdown = ref(false)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const handleDestinationInput = () => {
  shippingForm.destinationId = null
  const q = destinationKeyword.value.trim()

  if (searchTimeout) clearTimeout(searchTimeout)
  if (q.length < 3) {
    destinationResults.value = []
    showDestinationDropdown.value = false
    return
  }

  searchTimeout = setTimeout(async () => {
    isSearchingDestination.value = true
    try {
      const data = await $fetch<RajaOngkirDestination[]>('/api/shipping/destinations', {
        query: { search: q },
      })
      destinationResults.value = data
      showDestinationDropdown.value = true
    } catch {
      destinationResults.value = []
    } finally {
      isSearchingDestination.value = false
    }
  }, 350)
}

const selectDestination = (item: RajaOngkirDestination) => {
  shippingForm.destinationId = item.id
  shippingForm.destinationLabel = item.label
  shippingForm.city = `${item.district_name}, ${item.city_name}`
  if (item.zip_code) {
    shippingForm.postalCode = item.zip_code
  }
  destinationKeyword.value = item.label
  showDestinationDropdown.value = false
}

// Form State Step 2: Pengiriman RajaOngkir
const shippingOptions = ref<ShippingRateOption[]>([])
const isLoadingRates = ref(false)
const ratesError = ref('')
const selectedShippingId = ref('')
const useInsurance = ref(true)

const selectedShipping = computed(
  () => shippingOptions.value.find((s) => s.id === selectedShippingId.value) ?? shippingOptions.value[0]
)

const totalWeightGram = computed(() => {
  const totalQty = cart.value.reduce((acc, item) => acc + item.quantity, 0)
  return Math.max(1000, totalQty * 1000)
})

const fetchRajaOngkirRates = async () => {
  if (!shippingForm.destinationId) return
  isLoadingRates.value = true
  ratesError.value = ''

  try {
    const rawRates = await $fetch<
      Array<{
        name: string
        code: string
        service: string
        description: string
        cost: number
        etd: string
      }>
    >('/api/shipping/cost', {
      method: 'POST',
      body: {
        destinationId: shippingForm.destinationId,
        weight: totalWeightGram.value,
        courier: 'jne:jnt:sicepat:pos:tiki',
      },
    })

    const mapped: ShippingRateOption[] = rawRates
      .filter((r) => typeof r.cost === 'number' && r.cost > 0)
      .sort((a, b) => a.cost - b.cost)
      .map((r, index) => ({
        id: `${r.code}-${r.service}-${index}`,
        name: `${r.code.toUpperCase()} - ${r.service} (${r.description})`,
        eta: r.etd ? `Estimasi tiba ${r.etd.replace(/hari/gi, '').trim()} hari` : 'Estimasi reguler',
        price: r.cost,
        badge: index === 0 ? 'Termurah' : r.code.toUpperCase(),
      }))

    shippingOptions.value = mapped
    if (mapped.length > 0 && !mapped.some((m) => m.id === selectedShippingId.value)) {
      selectedShippingId.value = mapped[0]!.id
    }
  } catch (err: any) {
    ratesError.value =
      err?.data?.statusMessage || 'Gagal memuat ongkos kirim dari RajaOngkir. Silakan coba lagi.'
  } finally {
    isLoadingRates.value = false
  }
}

// Kode Promo Opsional
const promoInput = ref('')
const appliedPromo = ref<{ code: string; percent: number } | null>(null)

const applyPromoCode = () => {
  const code = promoInput.value.trim().toUpperCase()
  if (!code) return
  if (code === 'NEXA10') {
    appliedPromo.value = { code: 'NEXA10', percent: 10 }
    showToast('Kode promo NEXA10 berhasil dipakai (Diskon 10%)!')
  } else {
    showToast('Kode promo tidak valid. Coba gunakan kode: NEXA10')
  }
}

const removePromo = () => {
  appliedPromo.value = null
  promoInput.value = ''
}

// Perhitungan Biaya
const shippingCost = computed(() => selectedShipping.value?.price ?? 0)
const insuranceCost = computed(() => (useInsurance.value ? 5000 : 0))
const discountAmount = computed(() => {
  if (!appliedPromo.value) return 0
  return Math.round((cartTotal.value * appliedPromo.value.percent) / 100)
})
const grandTotal = computed(() =>
  Math.max(0, cartTotal.value + shippingCost.value + insuranceCost.value - discountAmount.value)
)

// Validasi & Navigasi Antar Step
const formError = ref('')

const validateStep1 = () => {
  if (!shippingForm.fullName.trim()) return 'Nama lengkap penerima wajib diisi.'
  if (!shippingForm.phone.trim() || shippingForm.phone.trim().length < 9)
    return 'Nomor WhatsApp / telepon tidak valid.'
  if (!shippingForm.email.trim() || !shippingForm.email.includes('@'))
    return 'Alamat email tidak valid.'
  if (!shippingForm.destinationId)
    return 'Pilih Kecamatan / Kota tujuan dari daftar pencarian agar ongkir dapat dihitung.'
  if (!shippingForm.address.trim() || shippingForm.address.trim().length < 10)
    return 'Alamat lengkap jalan/nomor rumah wajib diisi.'
  return ''
}

const nextStep = async () => {
  formError.value = ''
  if (currentStep.value === 1) {
    const err = validateStep1()
    if (err) {
      formError.value = err
      return
    }
    currentStep.value = 2
    window.scrollTo({ top: 0, behavior: 'smooth' })
    await fetchRajaOngkirRates()
    return
  }

  if (currentStep.value === 2) {
    if (!selectedShipping.value) {
      formError.value = 'Silakan pilih salah satu layanan kurir terlebih dahulu.'
      return
    }
    currentStep.value = 3
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const prevStep = () => {
  formError.value = ''
  if (currentStep.value > 1) {
    currentStep.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const goToStep = (stepId: number) => {
  if (stepId < currentStep.value) {
    formError.value = ''
    currentStep.value = stepId
  }
}

// Selesaikan Pesanan Setelah Midtrans Sukses / Pending
// Simpan riwayat pesanan sementara & langsung arahkan ke /dashboard/pesanan
// Simpan pesanan ke PostgreSQL setelah mendapat respons dari Midtrans
const finalizeAndRedirectToOrders = async (
  generatedCode: string,
  status: 'paid' | 'pending',
  paymentMethodLabel: string,
  snapToken: string
) => {
  await $fetch('/api/orders', {
    method: 'POST',
    body: {
      orderNumber: generatedCode,
      status,
      paymentMethod: paymentMethodLabel,
      snapToken,
      customerName: shippingForm.fullName,
      customerEmail: shippingForm.email,
      customerPhone: shippingForm.phone,
      shippingAddress: shippingForm.address,
      shippingNotes: shippingForm.notes,
      shippingCourier: selectedShipping.value?.name || '',
      subtotal: cartTotal.value,
      shippingCost: shippingCost.value,
      insuranceCost: insuranceCost.value,
      discountAmount: discountAmount.value,
      grandTotal: grandTotal.value,
      items: cart.value.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        image: item.product.image,
        price: item.product.price,
        quantity: item.quantity,
      })),
    },
  })

  clearCart()
  await navigateTo(`/dashboard/pesanan?order=${generatedCode}`)
}

// Langsung buka popup Midtrans Snap saat tombol Bayar diklik
const payWithMidtrans = async () => {
  if (cart.value.length === 0) return
  isSubmitting.value = true
  formError.value = ''

  const generatedCode = `NX-${Date.now().toString().slice(-6)}`

  try {
    const [snapInstance, { token }] = await Promise.all([
      ensureMidtransSnap(),
      $fetch<{ token: string; redirectUrl: string }>('/api/payment/midtrans', {
        method: 'POST',
        body: {
          orderId: generatedCode,
          grossAmount: grandTotal.value,
          customer: {
            fullName: shippingForm.fullName,
            email: shippingForm.email,
            phone: shippingForm.phone,
            address: shippingForm.address,
            city: shippingForm.city,
            postalCode: shippingForm.postalCode,
          },
          items: cart.value.map((item) => ({
            id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
          })),
          shippingCost: shippingCost.value,
          insuranceCost: insuranceCost.value,
          discountAmount: discountAmount.value,
        },
      }),
    ])

    if (!snapInstance) {
      formError.value = 'Popup Midtrans gagal dimuat. Periksa MIDTRANS_CLIENT_KEY di .env.'
      return
    }

    snapInstance.pay(token, {
      onSuccess: async (result: any) => {
        const method = result?.payment_type?.replace(/_/g, ' ').toUpperCase() || 'MIDTRANS'
        showToast(`Pembayaran ${generatedCode} berhasil!`)
        await finalizeAndRedirectToOrders(generatedCode, 'paid', method, token)
      },
      onPending: async (result: any) => {
        const method = result?.payment_type?.replace(/_/g, ' ').toUpperCase() || 'MIDTRANS'
        showToast(`Pesanan ${generatedCode} menunggu pembayaran.`)
        await finalizeAndRedirectToOrders(generatedCode, 'pending', method, token)
      },
      onError: () => {
        formError.value = 'Pembayaran gagal diproses oleh Midtrans. Silakan coba lagi.'
      },
      onClose: () => {
        showToast('Popup pembayaran ditutup sebelum selesai.')
      },
    })
  } catch (err: any) {
    formError.value =
      err?.data?.statusMessage ||
      err?.message ||
      'Gagal memulai pembayaran Midtrans. Pastikan MIDTRANS_SERVER_KEY & MIDTRANS_CLIENT_KEY sudah benar.'
  } finally {
    isSubmitting.value = false
  }
}
const copyOrderNumber = () => {
  if (!orderNumber.value) return
  navigator.clipboard?.writeText(orderNumber.value)
  showToast('Nomor pesanan disalin ke clipboard!')
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <!-- Header Checkout -->
    <div class="border-b border-slate-200 bg-white">
      <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <NuxtLink
              to="/products"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-indigo-600"
            >
              <ArrowLeft class="h-3.5 w-3.5" />
              <span>Lanjut Belanja</span>
            </NuxtLink>
            <h1 class="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Checkout Pesanan
            </h1>
          </div>

          <div class="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700">
            <Truck class="h-4 w-4" />
            <span>Dikirim dari Jakarta Timur</span>
          </div>
        </div>
      </div>
    </div>

    <!-- STATE 1: PESANAN BERHASIL -->
    <div
      v-if="isOrderSuccess && completedOrder"
      class="mx-auto max-w-3xl px-4 pt-12 sm:px-6 lg:px-8"
    >
      <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div class="text-center">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 class="h-9 w-9" />
          </div>
          <span class="mt-4 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            Transaksi Tercatat
          </span>
          <h2 class="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Terima Kasih, {{ completedOrder.customerName }}!
          </h2>
          <p class="mt-1.5 text-sm text-slate-500">
            Pesananmu sedang diproses dari gudang Jakarta Timur.
          </p>

          <div class="mt-5 inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3">
            <div class="text-left">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nomor Pesanan</p>
              <p class="text-base font-extrabold text-slate-900">{{ orderNumber }}</p>
            </div>
            <button
              type="button"
              @click="copyOrderNumber"
              class="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
              title="Salin Nomor Pesanan"
            >
              <Copy class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="mt-8 space-y-5 border-t border-slate-100 pt-6">
          <div class="grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 text-xs sm:grid-cols-2">
            <div>
              <p class="font-bold uppercase tracking-wider text-slate-400">Alamat Pengiriman</p>
              <p class="mt-1 font-bold text-slate-900">{{ completedOrder.customerName }} ({{ completedOrder.phone }})</p>
              <p class="mt-0.5 leading-relaxed text-slate-600">{{ completedOrder.fullAddress }}</p>
            </div>
            <div>
              <p class="font-bold uppercase tracking-wider text-slate-400">Kurir & Status Pembayaran</p>
              <p class="mt-1 font-bold text-slate-900">{{ completedOrder.shippingName }}</p>
              <p class="mt-0.5 font-semibold text-emerald-700">{{ completedOrder.paymentName }}</p>
            </div>
          </div>

          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Item Dipesan</p>
            <div class="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200/80 px-4">
              <div
                v-for="item in completedOrder.items"
                :key="item.product.id"
                class="flex items-center justify-between gap-3 py-3"
              >
                <div class="flex items-center gap-3">
                  <img
                    :src="item.product.image"
                    :alt="item.product.name"
                    class="h-12 w-12 rounded-xl bg-slate-100 object-cover"
                  />
                  <div>
                    <p class="text-xs font-bold text-slate-900 sm:text-sm">{{ item.product.name }}</p>
                    <p class="text-xs text-slate-500">{{ item.quantity }} x {{ formatRupiah(item.product.price) }}</p>
                  </div>
                </div>
                <p class="text-xs font-extrabold text-slate-900 sm:text-sm">
                  {{ formatRupiah(item.product.price * item.quantity) }}
                </p>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between rounded-2xl bg-indigo-50 px-5 py-4">
            <span class="text-sm font-bold text-indigo-900">Total Pembayaran</span>
            <span class="text-xl font-extrabold text-indigo-600">
              {{ formatRupiah(completedOrder.grandTotal) }}
            </span>
          </div>

          <div class="flex flex-col gap-3 pt-2 sm:flex-row">
            <NuxtLink
              to="/dashboard"
              class="flex flex-1 items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Lihat Riwayat Pesanan
            </NuxtLink>
            <NuxtLink
              to="/"
              class="flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Kembali ke Beranda
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- STATE 2: KERANJANG KOSONG -->
    <div v-else-if="cart.length === 0" class="mx-auto max-w-xl px-4 pt-16 text-center">
      <div class="rounded-3xl border border-dashed border-slate-300 bg-white p-12">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <ShoppingBag class="h-8 w-8" />
        </div>
        <h2 class="mt-4 text-xl font-extrabold text-slate-900">Keranjang Belanjamu Kosong</h2>
        <p class="mt-1 text-sm text-slate-500">
          Tambahkan produk ke keranjang terlebih dahulu sebelum melakukan checkout.
        </p>
        <NuxtLink
          to="/products"
          class="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
        >
          <span>Jelajahi Katalog Produk</span>
        </NuxtLink>
      </div>
    </div>

    <!-- STATE 3: FORM CHECKOUT MULTI-STEP -->
    <div v-else class="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <!-- Progress Stepper Bar -->
      <div class="mb-8 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-6">
        <ol class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <li
            v-for="step in steps"
            :key="step.id"
            @click="goToStep(step.id)"
            :class="[
              'flex items-center gap-3.5 rounded-xl border p-3.5 transition-all',
              currentStep === step.id
                ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-100'
                : currentStep > step.id
                  ? 'cursor-pointer border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50'
                  : 'border-slate-200/80 bg-slate-50/50 opacity-65',
            ]"
          >
            <div
              :class="[
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold transition',
                currentStep === step.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : currentStep > step.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600',
              ]"
            >
              <Check v-if="currentStep > step.id" class="h-5 w-5" />
              <component :is="step.icon" v-else class="h-5 w-5" />
            </div>

            <div class="min-w-0">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Langkah {{ step.id }}
              </p>
              <p class="truncate text-sm font-extrabold text-slate-900">{{ step.title }}</p>
              <p class="truncate text-xs text-slate-500">{{ step.desc }}</p>
            </div>
          </li>
        </ol>
      </div>

      <div class="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        <!-- KOLOM KIRI: FORMULIR (7 KOLOM) -->
        <div class="space-y-6 lg:col-span-7">
          <div
            v-if="formError"
            class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 sm:text-sm"
          >
            {{ formError }}
          </div>

          <!-- ==================== STEP 1: ALAMAT PENGIRIMAN ==================== -->
          <div
            v-if="currentStep === 1"
            class="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8"
          >
            <div class="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <MapPin class="h-5 w-5 text-indigo-600" />
              <div>
                <h2 class="text-lg font-extrabold text-slate-900">Informasi Penerima & Alamat</h2>
                <p class="text-xs text-slate-500">Pilih kecamatan/kota tujuan dari RajaOngkir untuk cek ongkir otomatis.</p>
              </div>
            </div>

            <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-slate-700">Nama Lengkap Penerima *</label>
                <input
                  v-model="shippingForm.fullName"
                  type="text"
                  placeholder="Nama lengkap penerima"
                  class="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700">Nomor WhatsApp / Telepon *</label>
                <input
                  v-model="shippingForm.phone"
                  type="tel"
                  placeholder="0812xxxxxxxx"
                  class="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700">Email Notifikasi *</label>
                <input
                  v-model="shippingForm.email"
                  type="email"
                  placeholder="nama@email.com"
                  class="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                />
              </div>

              <!-- Pencarian Kecamatan / Kota RajaOngkir -->
              <div class="relative sm:col-span-2">
                <label class="block text-xs font-bold text-slate-700">
                  Kecamatan / Kota / Kode Pos Tujuan (RajaOngkir) *
                </label>
                <div class="relative mt-1.5">
                  <Search class="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    v-model="destinationKeyword"
                    type="text"
                    @input="handleDestinationInput"
                    @focus="destinationResults.length > 0 && (showDestinationDropdown = true)"
                    placeholder="Ketik minimal 3 huruf, misal: Tebet, Bandung, Surabaya..."
                    class="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                  />
                  <Loader2
                    v-if="isSearchingDestination"
                    class="absolute right-3.5 top-3 h-4 w-4 animate-spin text-indigo-600"
                  />
                </div>

                <p
                  v-if="shippingForm.destinationId"
                  class="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
                >
                  <Check class="h-3.5 w-3.5" />
                  <span>Tujuan terverifikasi: {{ shippingForm.destinationLabel }}</span>
                </p>

                <div
                  v-if="showDestinationDropdown && destinationResults.length > 0"
                  class="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"
                >
                  <button
                    v-for="item in destinationResults"
                    :key="item.id"
                    type="button"
                    @click="selectDestination(item)"
                    class="flex w-full flex-col rounded-xl px-3.5 py-2.5 text-left transition hover:bg-indigo-50"
                  >
                    <span class="text-xs font-bold text-slate-900">{{ item.label }}</span>
                    <span class="text-[11px] text-slate-500">
                      {{ item.subdistrict_name }}, {{ item.district_name }} • {{ item.city_name }} ({{ item.zip_code }})
                    </span>
                  </button>
                </div>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-slate-700">Alamat Lengkap (Jalan, RT/RW, Nomor Rumah) *</label>
                <textarea
                  v-model="shippingForm.address"
                  rows="3"
                  placeholder="Masukkan nama jalan, nomor rumah, patokan lokasi..."
                  class="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-slate-700">Catatan untuk Kurir (Opsional)</label>
                <input
                  v-model="shippingForm.notes"
                  type="text"
                  placeholder="Contoh: Titip di pos satpam / pagar warna hitam"
                  class="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div class="mt-8 flex justify-end border-t border-slate-100 pt-5">
              <button
                type="button"
                @click="nextStep"
                class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
              >
                <span>Cek Ongkir & Lanjut</span>
                <ChevronRight class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- ==================== STEP 2: METODE PENGIRIMAN (RAJAONGKIR) ==================== -->
          <div
            v-else-if="currentStep === 2"
            class="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8"
          >
            <div class="flex items-center justify-between gap-2.5 border-b border-slate-100 pb-4">
              <div class="flex items-center gap-2.5">
                <Truck class="h-5 w-5 text-indigo-600" />
                <div>
                  <h2 class="text-lg font-extrabold text-slate-900">Pilih Layanan Pengiriman</h2>
                  <p class="text-xs text-slate-500">
                    Asal: <span class="font-bold text-slate-700">Jakarta Timur</span> → Tujuan:
                    <span class="font-bold text-slate-700">{{ shippingForm.city }}</span>
                  </p>
                </div>
              </div>

              <span class="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                Berat {{ (totalWeightGram / 1000).toFixed(1) }} kg
              </span>
            </div>

            <div v-if="isLoadingRates" class="space-y-3 py-8">
              <div class="flex items-center justify-center gap-2 text-xs font-bold text-indigo-600">
                <Loader2 class="h-5 w-5 animate-spin" />
                <span>Menghitung ongkos kirim dari Jakarta Timur via RajaOngkir...</span>
              </div>
              <div v-for="n in 3" :key="n" class="h-16 animate-pulse rounded-2xl bg-slate-100" />
            </div>

            <div
              v-else-if="ratesError"
              class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center"
            >
              <p class="text-xs font-bold text-rose-700">{{ ratesError }}</p>
              <button
                type="button"
                @click="fetchRajaOngkirRates"
                class="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                Muat Ulang Tarif
              </button>
            </div>

            <div v-else class="mt-6 max-h-96 space-y-3 overflow-y-auto pr-1">
              <label
                v-for="option in shippingOptions"
                :key="option.id"
                :class="[
                  'flex cursor-pointer items-center justify-between gap-4 rounded-2xl border-2 p-4 transition-all',
                  selectedShippingId === option.id
                    ? 'border-indigo-600 bg-indigo-50/50'
                    : 'border-slate-200 hover:border-slate-300',
                ]"
              >
                <div class="flex items-center gap-3.5">
                  <input
                    v-model="selectedShippingId"
                    type="radio"
                    :value="option.id"
                    class="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="text-sm font-extrabold text-slate-900">{{ option.name }}</span>
                      <span class="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        {{ option.badge }}
                      </span>
                    </div>
                    <p class="mt-0.5 text-xs text-slate-500">{{ option.eta }}</p>
                  </div>
                </div>

                <span class="shrink-0 text-sm font-extrabold text-slate-900">
                  {{ formatRupiah(option.price) }}
                </span>
              </label>
            </div>

            <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label class="flex cursor-pointer items-start justify-between gap-3">
                <div class="flex items-start gap-3">
                  <input
                    v-model="useInsurance"
                    type="checkbox"
                    class="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <p class="text-xs font-extrabold text-slate-900 sm:text-sm">Proteksi & Asuransi Pengiriman</p>
                    <p class="text-xs text-slate-500">
                      Ganti rugi penuh 100% jika paket rusak atau hilang selama perjalanan.
                    </p>
                  </div>
                </div>
                <span class="text-xs font-extrabold text-slate-800">{{ formatRupiah(5000) }}</span>
              </label>
            </div>

            <div class="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
              <button
                type="button"
                @click="prevStep"
                class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <ChevronLeft class="h-4 w-4" />
                <span>Kembali</span>
              </button>

              <button
                type="button"
                :disabled="isLoadingRates || shippingOptions.length === 0"
                @click="nextStep"
                class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:bg-slate-300"
              >
                <span>Lanjut ke Pembayaran</span>
                <ChevronRight class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- ==================== STEP 3: KONFIRMASI & BAYAR MIDTRANS ==================== -->
          <div
            v-else
            class="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8"
          >
            <div class="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <CreditCard class="h-5 w-5 text-indigo-600" />
              <div>
                <h2 class="text-lg font-extrabold text-slate-900">Konfirmasi & Pembayaran Midtrans</h2>
                <p class="text-xs text-slate-500">
                  Klik tombol bayar di bawah untuk membuka popup pembayaran aman Midtrans.
                </p>
              </div>
            </div>

            <!-- Info Payment Gateway Midtrans -->
            <div class="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
              <div class="flex items-start gap-3.5">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <ShieldCheck class="h-5 w-5" />
                </div>
                <div>
                  <p class="text-sm font-extrabold text-slate-900">
                    Midtrans Secure Payment Gateway
                  </p>
                  <p class="mt-1 text-xs leading-relaxed text-slate-600">
                    Pilih metode pembayaran langsung di jendela Midtrans (Virtual Account BCA, Mandiri, BNI, BRI, QRIS, GoPay, ShopeePay, atau Kartu Kredit) dengan verifikasi otomatis.
                  </p>
                  <div class="mt-3 flex flex-wrap gap-1.5">
                    <span
                      v-for="tag in ['Virtual Account', 'QRIS', 'GoPay / E-Wallet', 'Kartu Kredit', 'Alfamart / Indomaret']"
                      :key="tag"
                      class="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-700"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Ringkasan Alamat & Kurir -->
            <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-bold uppercase tracking-wider text-slate-400">Detail Pengiriman</span>
                <button
                  type="button"
                  @click="currentStep = 1"
                  class="font-bold text-indigo-600 hover:underline"
                >
                  Ubah Data
                </button>
              </div>
              <p class="mt-1.5 font-extrabold text-slate-900">
                {{ shippingForm.fullName }} • {{ shippingForm.phone }}
              </p>
              <p class="mt-0.5 text-slate-600">
                {{ shippingForm.address }}, {{ shippingForm.destinationLabel }}
              </p>
              <p class="mt-1.5 font-semibold text-indigo-700">
                Kurir: {{ selectedShipping?.name }} ({{ formatRupiah(shippingCost) }})
              </p>
            </div>

            <div class="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
              <button
                type="button"
                @click="prevStep"
                class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <ChevronLeft class="h-4 w-4" />
                <span>Kembali</span>
              </button>

              <button
                type="button"
                :disabled="isSubmitting"
                @click="payWithMidtrans"
                class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:bg-slate-400"
              >
                <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin" />
                <Sparkles v-else class="h-4 w-4" />
                <span>{{ isSubmitting ? 'Membuka Midtrans...' : `Bayar Sekarang • ${formatRupiah(grandTotal)}` }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- KOLOM KANAN: RINGKASAN ITEM KERANJANG & RINCIAN BIAYA (5 KOLOM) -->
        <aside class="lg:col-span-5">
          <div class="sticky top-24 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <div class="flex items-center gap-2">
                <Package class="h-5 w-5 text-indigo-600" />
                <h3 class="text-base font-extrabold text-slate-900">
                  Ringkasan Pesanan ({{ cart.reduce((acc, i) => acc + i.quantity, 0) }} Item)
                </h3>
              </div>
            </div>

            <div class="mt-4 max-h-72 space-y-3.5 overflow-y-auto pr-1">
              <div
                v-for="item in cart"
                :key="item.product.id"
                class="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
              >
                <div class="flex min-w-0 items-center gap-3">
                  <img
                    :src="item.product.image"
                    :alt="item.product.name"
                    class="h-14 w-14 shrink-0 rounded-xl bg-white object-cover"
                  />
                  <div class="min-w-0">
                    <p class="truncate text-xs font-bold text-slate-900 sm:text-sm">
                      {{ item.product.name }}
                    </p>
                    <p class="text-xs text-slate-500">
                      {{ item.quantity }} x {{ formatRupiah(item.product.price) }}
                    </p>
                  </div>
                </div>

                <span class="shrink-0 text-xs font-extrabold text-slate-900 sm:text-sm">
                  {{ formatRupiah(item.product.price * item.quantity) }}
                </span>
              </div>
            </div>

            <div class="mt-5 border-t border-slate-100 pt-4">
              <label class="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Tag class="h-3.5 w-3.5 text-indigo-600" />
                <span>Kode Promo (Coba: NEXA10)</span>
              </label>

              <div v-if="!appliedPromo" class="mt-2 flex gap-2">
                <input
                  v-model="promoInput"
                  type="text"
                  placeholder="Masukkan kode promo"
                  class="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold uppercase text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  @click="applyPromoCode"
                  class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                >
                  Pakai
                </button>
              </div>

              <div
                v-else
                class="mt-2 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700"
              >
                <span>Promo {{ appliedPromo.code }} (-{{ appliedPromo.percent }}%) aktif</span>
                <button type="button" @click="removePromo" class="text-rose-600 hover:underline">
                  Hapus
                </button>
              </div>
            </div>

            <div class="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-xs sm:text-sm">
              <div class="flex justify-between text-slate-600">
                <span>Subtotal Produk</span>
                <span class="font-semibold text-slate-900">{{ formatRupiah(cartTotal) }}</span>
              </div>

              <div class="flex justify-between text-slate-600">
                <span>Ongkos Kirim</span>
                <span class="font-semibold text-slate-900">
                  {{ selectedShipping ? formatRupiah(shippingCost) : 'Pilih di Step 2' }}
                </span>
              </div>

              <div v-if="useInsurance" class="flex justify-between text-slate-600">
                <span>Asuransi Pengiriman</span>
                <span class="font-semibold text-slate-900">{{ formatRupiah(insuranceCost) }}</span>
              </div>

              <div v-if="discountAmount > 0" class="flex justify-between font-semibold text-emerald-600">
                <span>Diskon Promo ({{ appliedPromo?.code }})</span>
                <span>-{{ formatRupiah(discountAmount) }}</span>
              </div>

              <div class="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-extrabold text-slate-900">
                <span>Total Tagihan</span>
                <span class="text-lg text-indigo-600">{{ formatRupiah(grandTotal) }}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>