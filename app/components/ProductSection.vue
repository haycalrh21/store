<script setup lang="ts">
import { Sparkles, PackageOpen, ArrowRight } from 'lucide-vue-next'
import type { ApiProduct } from '~/components/ProductGalleryCard.vue'

const { data: rawResponse, pending } = await useFetch<ApiProduct[] | { products?: ApiProduct[]; data?: ApiProduct[] }>(
  '/api/admin/products'
)
const productList = computed<ApiProduct[]>(() => {
  const res = rawResponse.value
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.products)) return res.products
  if (Array.isArray(res.data)) return res.data
  return []
})

const selectedCategory = ref('Semua')

const categories = computed(() => {
  const unique = new Set(productList.value.map((p) => p.category).filter(Boolean))
  return ['Semua', ...Array.from(unique)]
})

const filteredProducts = computed(() => {
  if (selectedCategory.value === 'Semua') return productList.value
  return productList.value.filter((p) => p.category === selectedCategory.value)
})

// State untuk Modal Quick View Galeri
const quickViewState = ref<{ product: ApiProduct | null; initialIndex: number }>({
  product: null,
  initialIndex: 0,
})

const openQuickView = (product: ApiProduct, activeIndex: number) => {
  quickViewState.value = { product, initialIndex: activeIndex }
}
</script>

<template>
  <section id="katalog-produk" class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
    <!-- Header Section -->
    <div class="reveal flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <div class="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          <Sparkles class="h-3.5 w-3.5" />
          <span>Koleksi Pilihan</span>
        </div>
        <h2 class="mt-2.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Produk Terbaru Kami
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          Geser atau klik indikator pada foto untuk melihat berbagai sudut tampilan produk.
        </p>
      </div>

      <!-- Filter Kategori Dinamis -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="cat in categories"
          :key="cat"
          type="button"
          @click="selectedCategory = cat"
          :class="[
            'rounded-full px-4 py-2 text-xs font-bold transition-all',
            selectedCategory === cat
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600',
          ]"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div
      v-if="pending"
      class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div
        v-for="n in 3"
        :key="n"
        class="animate-pulse overflow-hidden rounded-3xl border border-slate-200 bg-white p-4"
      >
        <div class="aspect-[4/3] w-full rounded-2xl bg-slate-200" />
        <div class="mt-4 h-5 w-2/3 rounded-lg bg-slate-200" />
        <div class="mt-2 h-4 w-full rounded-lg bg-slate-100" />
        <div class="mt-5 h-10 w-full rounded-xl bg-slate-200" />
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredProducts.length === 0"
      class="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center"
    >
      <PackageOpen class="mx-auto h-10 w-10 text-slate-400" />
      <h3 class="mt-3 text-base font-bold text-slate-900">Belum ada produk tersedia</h3>
      <p class="mt-1 text-xs text-slate-500">Tambahkan produk melalui Admin Panel agar muncul di halaman ini.</p>
    </div>

    <!-- Grid Kartu Produk dengan Carousel -->
    <div
      v-else
      class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      <ProductGalleryCard
        v-for="item in filteredProducts"
        :key="item.id"
        :product="item"
        class="reveal"
        @quick-view="openQuickView"
      />
    </div>

    <!-- Link ke Katalog Lengkap -->
    <div v-if="productList.length > 0" class="mt-10 text-center">
      <NuxtLink
        to="/products"
        class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-xs font-extrabold text-slate-800 shadow-xs transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 sm:text-sm"
      >
        <span>Jelajahi Semua Katalog</span>
        <ArrowRight class="h-4 w-4" />
      </NuxtLink>
    </div>

    <!-- Modal Quick View Galeri -->
    <ProductQuickViewModal
      :product="quickViewState.product"
      :initial-index="quickViewState.initialIndex"
      @close="quickViewState.product = null"
    />
  </section>
</template>