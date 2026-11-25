<script setup lang="ts">
import {
  ArrowLeft,
  Star,
  ShoppingCart,
  ShieldCheck,
  Truck,
  Check,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-vue-next'
import type { ApiProduct } from '~/components/ProductGalleryCard.vue'

const route = useRoute()
const { addToCart, isCartOpen, formatRupiah } = useStore()

const quantity = ref(1)
const activeSlide = ref(0)
const touchStartX = ref(0)

// Ambil data produk dari server agar tetap tersedia saat refresh / buka link langsung
const { data: rawResponse, pending } = await useFetch<
  ApiProduct[] | { products?: ApiProduct[]; data?: ApiProduct[] }
>('/api/admin/products')

const productList = computed<ApiProduct[]>(() => {
  const res = rawResponse.value
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.products)) return res.products
  if (Array.isArray(res.data)) return res.data
  return []
})

const product = computed(() => {
  const id = Number(route.params.id)
  return productList.value.find((p) => p.id === id)
})

// Gabungkan array images & fallback image utama tanpa duplikat
const galleryImages = computed<string[]>(() => {
  if (!product.value) return []
  const list = Array.isArray(product.value.images)
    ? product.value.images.filter((url) => typeof url === 'string' && url.trim().length > 0)
    : []

  if (product.value.image && !list.includes(product.value.image)) {
    return [product.value.image, ...list]
  }
  return list.length > 0
    ? list
    : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80']
})

const hasMultipleImages = computed(() => galleryImages.value.length > 1)

const prevSlide = () => {
  const total = galleryImages.value.length
  if (total <= 1) return
  activeSlide.value = (activeSlide.value - 1 + total) % total
}

const nextSlide = () => {
  const total = galleryImages.value.length
  if (total <= 1) return
  activeSlide.value = (activeSlide.value + 1) % total
}

const handleTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.changedTouches[0]?.clientX ?? 0
}

const handleTouchEnd = (e: TouchEvent) => {
  if (!hasMultipleImages.value) return
  const endX = e.changedTouches[0]?.clientX ?? 0
  const diff = touchStartX.value - endX
  if (Math.abs(diff) > 35) {
    if (diff > 0) nextSlide()
    else prevSlide()
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft') prevSlide()
  if (e.key === 'ArrowRight') nextSlide()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))

// Reset jumlah & slide aktif jika pindah ke produk lain
watch(
  () => route.params.id,
  () => {
    quantity.value = 1
    activeSlide.value = 0
  }
)

const buildCartPayload = () => {
  if (!product.value) return null
  return {
    id: product.value.id,
    name: product.value.name,
    category: product.value.category,
    price: product.value.price,
    originalPrice: product.value.originalPrice ?? undefined,
    discount: product.value.discount ?? undefined,
    rating: product.value.rating ?? 5.0,
    reviewsCount: product.value.reviewsCount ?? 0,
    stock: product.value.stock,
    image: galleryImages.value[0] || product.value.image,
    images: galleryImages.value,
    badge: product.value.badge ?? undefined,
    description: product.value.description || '',
    specs: product.value.specs ?? [],
  }
}

const handleAddCart = () => {
  const payload = buildCartPayload()
  if (!payload) return
  addToCart(payload, quantity.value)
}

const handleBuyNow = () => {
  const payload = buildCartPayload()
  if (!payload) return
  addToCart(payload, quantity.value)
  isCartOpen.value = true
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <!-- Tombol Kembali -->
    <NuxtLink
      to="/#katalog-produk"
      class="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-indigo-600"
    >
      <ArrowLeft class="h-4 w-4" />
      <span>Kembali ke Katalog</span>
    </NuxtLink>

    <!-- Loading Skeleton -->
    <div v-if="pending" class="mt-8 grid animate-pulse gap-10 lg:grid-cols-2">
      <div class="space-y-4">
        <div class="aspect-square w-full rounded-3xl bg-slate-200" />
        <div class="flex gap-3">
          <div v-for="n in 3" :key="n" class="h-20 w-20 rounded-2xl bg-slate-200" />
        </div>
      </div>
      <div class="space-y-4">
        <div class="h-6 w-32 rounded-full bg-slate-200" />
        <div class="h-10 w-3/4 rounded-xl bg-slate-200" />
        <div class="h-14 w-1/2 rounded-xl bg-slate-200" />
        <div class="h-24 w-full rounded-xl bg-slate-100" />
      </div>
    </div>

    <!-- Jika Produk Tidak Ditemukan -->
    <div v-else-if="!product" class="py-24 text-center">
      <h1 class="text-2xl font-bold text-slate-900">Produk tidak ditemukan</h1>
      <p class="mt-1 text-sm text-slate-500">Produk mungkin sudah dihapus atau tautan tidak valid.</p>
      <NuxtLink to="/" class="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">
        Kembali ke Beranda
      </NuxtLink>
    </div>

    <!-- Konten Detail Produk -->
    <div v-else class="mt-8 grid gap-10 lg:grid-cols-2 lg:items-start">
      <!-- Kiri: Galeri Carousel Interaktif -->
      <div class="space-y-4">
        <div
          class="group relative aspect-square w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm select-none"
          @touchstart.passive="handleTouchStart"
          @touchend.passive="handleTouchEnd"
        >
          <!-- Gambar Utama dengan Crossfade & Subtle Zoom -->
          <img
            v-for="(imgUrl, idx) in galleryImages"
            :key="`${product.id}-${idx}`"
            :src="imgUrl"
            :alt="`${product.name} - Foto ${idx + 1}`"
            :class="[
              'absolute inset-0 h-full w-full object-cover transition-all duration-500 ease-out',
              idx === activeSlide
                ? 'scale-100 opacity-100'
                : 'pointer-events-none scale-105 opacity-0',
            ]"
          />

          <!-- Indikator Jumlah Foto di Kanan Atas -->
          <div
            v-if="hasMultipleImages"
            class="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-slate-900/75 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md"
          >
            <Layers class="h-3.5 w-3.5 text-indigo-300" />
            <span>{{ activeSlide + 1 }} / {{ galleryImages.length }}</span>
          </div>

          <!-- Navigasi Panah & Bar Progres -->
          <template v-if="hasMultipleImages">
            <button
              type="button"
              @click="prevSlide"
              aria-label="Foto sebelumnya"
              class="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg backdrop-blur-md transition hover:scale-110 hover:bg-white"
            >
              <ChevronLeft class="h-5 w-5" />
            </button>

            <button
              type="button"
              @click="nextSlide"
              aria-label="Foto berikutnya"
              class="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg backdrop-blur-md transition hover:scale-110 hover:bg-white"
            >
              <ChevronRight class="h-5 w-5" />
            </button>

            <!-- Bar Progres Bawah -->
            <div class="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/50 to-transparent" />
            <div class="absolute inset-x-5 bottom-4 flex items-center gap-2">
              <button
                v-for="(_, idx) in galleryImages"
                :key="idx"
                type="button"
                @click="activeSlide = idx"
                :aria-label="`Pilih foto ${idx + 1}`"
                class="flex-1 py-1"
              >
                <span
                  :class="[
                    'block h-1.5 w-full rounded-full transition-all duration-300',
                    idx === activeSlide ? 'bg-white shadow-xs' : 'bg-white/40 hover:bg-white/75',
                  ]"
                />
              </button>
            </div>
          </template>
        </div>

        <!-- Bar Thumbnail Foto -->
        <div v-if="hasMultipleImages" class="flex gap-3 overflow-x-auto pb-1">
          <button
            v-for="(thumb, idx) in galleryImages"
            :key="idx"
            type="button"
            @click="activeSlide = idx"
            :class="[
              'relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all',
              idx === activeSlide
                ? 'scale-105 border-indigo-600 ring-4 ring-indigo-100'
                : 'border-slate-200 opacity-65 hover:opacity-100',
            ]"
          >
            <img :src="thumb" :alt="`Thumbnail ${idx + 1}`" class="h-full w-full object-cover" />
          </button>
        </div>
      </div>

      <!-- Kanan: Informasi & Aksi -->
      <div class="space-y-6">
        <div class="flex flex-wrap items-center gap-3">
          <span class="rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-700">
            {{ product.category }}
          </span>
          <span
            v-if="product.badge"
            class="rounded-full bg-rose-600 px-3.5 py-1 text-xs font-bold text-white shadow-xs"
          >
            {{ product.badge }}
          </span>
        </div>

        <div>
          <h1 class="text-3xl font-extrabold capitalize tracking-tight text-slate-900 sm:text-4xl">
            {{ product.name }}
          </h1>

          <div class="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <div class="flex items-center gap-1 font-bold text-amber-500">
              <Star class="h-4 w-4 fill-amber-400" />
              <span>{{ product.rating ?? 5.0 }}</span>
            </div>
            <span class="text-slate-300">|</span>
            <span class="text-slate-600">{{ product.reviewsCount ?? 0 }} Ulasan</span>
            <span class="text-slate-300">|</span>
            <span
              :class="[
                'font-semibold',
                product.stock > 0 ? 'text-emerald-600' : 'text-rose-600',
              ]"
            >
              {{ product.stock > 0 ? `Stok tersedia (${product.stock})` : 'Stok habis' }}
            </span>
          </div>
        </div>

        <!-- Harga & Diskon -->
        <div class="border-y border-slate-200 py-5">
          <div
            v-if="product.originalPrice && product.originalPrice > product.price"
            class="mb-1 flex items-center gap-2"
          >
            <span class="text-sm text-slate-400 line-through">
              {{ formatRupiah(product.originalPrice) }}
            </span>
            <span
              v-if="product.discount"
              class="rounded-lg bg-rose-100 px-2 py-0.5 text-xs font-extrabold text-rose-600"
            >
              Hemat {{ product.discount }}%
            </span>
          </div>
          <p class="text-3xl font-extrabold text-indigo-600">
            {{ formatRupiah(product.price) }}
          </p>
        </div>

        <p class="leading-relaxed text-slate-600">
          {{ product.description || 'Produk berkualitas tinggi dengan garansi resmi.' }}
        </p>

        <!-- Spesifikasi Utama -->
        <div v-if="product.specs && product.specs.length > 0">
          <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900">Spesifikasi Utama</h3>
          <ul class="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <li
              v-for="spec in product.specs"
              :key="spec"
              class="flex items-center gap-2 text-sm text-slate-700"
            >
              <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check class="h-3.5 w-3.5" />
              </span>
              <span>{{ spec }}</span>
            </li>
          </ul>
        </div>

        <!-- Pilih Jumlah & Tombol Beli -->
        <div class="space-y-4 pt-2">
          <div class="flex items-center gap-4">
            <span class="text-sm font-semibold text-slate-700">Jumlah:</span>
            <div class="flex items-center rounded-xl border border-slate-300 bg-white">
              <button
                type="button"
                @click="quantity = Math.max(1, quantity - 1)"
                class="p-2.5 text-slate-600 hover:text-indigo-600"
              >
                <Minus class="h-4 w-4" />
              </button>
              <span class="w-10 text-center text-sm font-bold text-slate-900">{{ quantity }}</span>
              <button
                type="button"
                :disabled="product.stock <= 0"
                @click="quantity = Math.min(product.stock, quantity + 1)"
                class="p-2.5 text-slate-600 hover:text-indigo-600 disabled:opacity-40"
              >
                <Plus class="h-4 w-4" />
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              :disabled="product.stock <= 0"
              @click="handleAddCart"
              class="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-indigo-600 bg-white px-6 py-3.5 text-sm font-bold text-indigo-600 transition hover:bg-indigo-50 active:scale-98 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
            >
              <ShoppingCart class="h-4 w-4" />
              <span>Masukkan Keranjang</span>
            </button>
            <button
              type="button"
              :disabled="product.stock <= 0"
              @click="handleBuyNow"
              class="flex flex-1 items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-98 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {{ product.stock > 0 ? 'Beli Langsung' : 'Stok Habis' }}
            </button>
          </div>
        </div>

        <!-- Garansi -->
        <div class="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
          <div class="flex items-center gap-2.5">
            <Truck class="h-5 w-5 shrink-0 text-indigo-600" />
            <span>Gratis pengiriman instan & asuransi paket</span>
          </div>
          <div class="flex items-center gap-2.5">
            <ShieldCheck class="h-5 w-5 shrink-0 text-indigo-600" />
            <span>100% Original & Garansi Resmi 2 Tahun</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>