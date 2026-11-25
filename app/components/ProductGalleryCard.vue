<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Eye,
  Layers,
  Sparkles,
} from 'lucide-vue-next'

export interface ApiProduct {
  id: number
  name: string
  category: string
  price: number
  originalPrice?: number | null
  discount?: number | null
  stock: number
  badge?: string | null
  image: string
  images?: string[] | null
  description?: string
  specs?: string[] | null
  rating?: number
  reviewsCount?: number
  createdAt?: string
}

const props = defineProps<{
  product: ApiProduct
}>()

const emit = defineEmits<{
  (e: 'quickView', product: ApiProduct, activeIndex: number): void
}>()

const { formatRupiah, addToCart } = useStore()

// Gabungkan array images & fallback image utama tanpa duplikat
const galleryImages = computed<string[]>(() => {
  const list = Array.isArray(props.product.images)
    ? props.product.images.filter((url) => typeof url === 'string' && url.trim().length > 0)
    : []

  if (props.product.image && !list.includes(props.product.image)) {
    return [props.product.image, ...list]
  }
  return list.length > 0
    ? list
    : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80']
})

const currentIndex = ref(0)
const touchStartX = ref(0)

const hasMultipleImages = computed(() => galleryImages.value.length > 1)

const prevSlide = () => {
  const total = galleryImages.value.length
  currentIndex.value = (currentIndex.value - 1 + total) % total
}

const nextSlide = () => {
  const total = galleryImages.value.length
  currentIndex.value = (currentIndex.value + 1) % total
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

const handleAddToCart = () => {
  addToCart({
    id: props.product.id,
    name: props.product.name,
    category: props.product.category,
    price: props.product.price,
    originalPrice: props.product.originalPrice ?? undefined,
    discount: props.product.discount ?? undefined,
    rating: props.product.rating ?? 5.0,
    reviewsCount: props.product.reviewsCount ?? 0,
    stock: props.product.stock,
    image: galleryImages.value[0] || props.product.image,
    images: galleryImages.value,
    badge: props.product.badge ?? undefined,
    description: props.product.description || '',
    specs: props.product.specs ?? [],
  })
}
</script>

<template>
  <article
    class="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10"
  >
    <!-- Area Media Carousel -->
    <div
      class="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 select-none"
      @touchstart.passive="handleTouchStart"
      @touchend.passive="handleTouchEnd"
    >
      <!-- Stack Gambar dengan Efek Crossfade & Subtle Zoom -->
      <NuxtLink
        :to="`/products/${product.id}`"
        class="block h-full w-full"
      >
        <img
          v-for="(imgUrl, idx) in galleryImages"
          :key="`${product.id}-${idx}`"
          :src="imgUrl"
          :alt="`${product.name} - Foto ${idx + 1}`"
          loading="lazy"
          :class="[
            'absolute inset-0 h-full w-full object-cover transition-all duration-500 ease-out',
            idx === currentIndex
              ? 'scale-100 opacity-100 group-hover:scale-105'
              : 'pointer-events-none scale-105 opacity-0',
          ]"
        />
      </NuxtLink>

      <!-- Gradient Halus di Bawah Gambar agar Indikator Terbaca Jelas -->
      <div
        v-if="hasMultipleImages"
        class="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/55 via-slate-950/15 to-transparent"
      />

      <!-- Badge Kiri Atas (Diskon / Label) -->
      <div class="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
        <span
          v-if="product.badge"
          class="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-white shadow-sm"
        >
          <Sparkles class="h-3 w-3" />
          <span>{{ product.badge }}</span>
        </span>

        <span
          class="rounded-full bg-blue/90 px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-xs backdrop-blur-md"
        >
          {{ product.category }}
        </span>
      </div>

      <!-- Indikator Jumlah Foto & Tombol Quick View di Kanan Atas -->
      <div class="absolute right-3 top-3 flex items-center gap-1.5">
        <span
          v-if="hasMultipleImages"
          class="inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md"
        >
          <Layers class="h-3 w-3 text-indigo-300" />
          <span>{{ currentIndex + 1 }}/{{ galleryImages.length }}</span>
        </span>

        <button
          type="button"
          @click.prevent="emit('quickView', product, currentIndex)"
          title="Lihat Galeri & Detail Cepat"
          class="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur-md transition hover:scale-105 hover:bg-indigo-600 hover:text-white"
        >
          <Eye class="h-4 w-4" />
        </button>
      </div>

      <!-- Tombol Panah Kiri / Kanan (Muncul Saat Hover di Desktop) -->
      <template v-if="hasMultipleImages">
        <button
          type="button"
          @click.prevent="prevSlide"
          aria-label="Foto sebelumnya"
          class="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 opacity-0 shadow-md backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-white group-hover:opacity-100"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>

        <button
          type="button"
          @click.prevent="nextSlide"
          aria-label="Foto berikutnya"
          class="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 opacity-0 shadow-md backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-white group-hover:opacity-100"
        >
          <ChevronRight class="h-4 w-4" />
        </button>

        <!-- Bar Progres Indikator Slide di Bawah Gambar -->
        <div class="absolute inset-x-3 bottom-2.5 flex items-center gap-1.5">
          <button
            v-for="(_, idx) in galleryImages"
            :key="idx"
            type="button"
            @click.prevent="currentIndex = idx"
            :aria-label="`Pilih foto ${idx + 1}`"
            class="group/dot flex-1 py-1"
          >
            <span
              :class="[
                'block h-1 w-full rounded-full transition-all duration-300',
                idx === currentIndex
                  ? 'bg-white shadow-xs'
                  : 'bg-white/40 group-hover/dot:bg-white/75',
              ]"
            />
          </button>
        </div>
      </template>
    </div>

    <!-- Konten Detail Produk -->
    <div class="flex flex-1 flex-col justify-between p-5">
      <div>
        <div class="flex items-start justify-between gap-2">
          <NuxtLink
            :to="`/products/${product.id}`"
            class="line-clamp-1 text-base font-extrabold capitalize text-slate-900 transition-colors hover:text-indigo-600"
          >
            {{ product.name }}
          </NuxtLink>
        </div>

        <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {{ product.description || 'Produk berkualitas tinggi dengan garansi resmi.' }}
        </p>

        <!-- Preview Thumbnail Mini (Jika Foto Lebih dari 1) -->
        <div v-if="hasMultipleImages" class="mt-3 flex items-center gap-2">
          <button
            v-for="(thumb, idx) in galleryImages"
            :key="idx"
            type="button"
            @click="currentIndex = idx"
            :class="[
              'relative h-10 w-10 overflow-hidden rounded-xl border-2 transition-all',
              idx === currentIndex
                ? 'scale-105 border-indigo-600 ring-2 ring-indigo-100'
                : 'border-slate-200 opacity-70 hover:opacity-100',
            ]"
          >
            <img
              :src="thumb"
              :alt="`Thumbnail ${idx + 1}`"
              class="h-full w-full object-cover"
            />
          </button>
        </div>
      </div>

      <!-- Harga & Tombol Keranjang -->
      <div class="mt-4 border-t border-slate-100 pt-3.5">
        <div class="flex items-end justify-between gap-2">
          <div>
            <div v-if="product.originalPrice && product.originalPrice > product.price" class="flex items-center gap-1.5">
              <span class="text-xs text-slate-400 line-through">
                {{ formatRupiah(product.originalPrice) }}
              </span>
              <span
                v-if="product.discount"
                class="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-600"
              >
                -{{ product.discount }}%
              </span>
            </div>
            <p class="text-lg font-extrabold text-slate-900">
              {{ formatRupiah(product.price) }}
            </p>
          </div>

          <span
            :class="[
              'rounded-lg px-2 py-1 text-[11px] font-bold',
              product.stock > 0
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-600',
            ]"
          >
            {{ product.stock > 0 ? `Stok ${product.stock}` : 'Habis' }}
          </span>
        </div>

        <div class="mt-3.5 flex items-center gap-2">
          <button
            type="button"
            :disabled="product.stock <= 0"
            @click="handleAddToCart"
            class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <ShoppingCart class="h-4 w-4" />
            <span>{{ product.stock > 0 ? 'Tambah ke Keranjang' : 'Stok Habis' }}</span>
          </button>

          <button
            type="button"
            @click="emit('quickView', product, currentIndex)"
            class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
          >
            Galeri
          </button>
        </div>
      </div>
    </div>
  </article>
</template>