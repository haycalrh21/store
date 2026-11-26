<script setup lang="ts">
import {
  Search,
  SlidersHorizontal,
  Star,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  PackageSearch,
} from 'lucide-vue-next'
import type { ApiProduct } from '~/components/ProductGalleryCard.vue'

// Ambil data produk langsung dari API server
const { data: rawResponse, pending } = await useFetch<
  ApiProduct[] | { products?: ApiProduct[]; data?: ApiProduct[] }
>('/api/admin/products')

const { formatRupiah } = useStore()

const products = computed<ApiProduct[]>(() => {
  const res = rawResponse.value
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.products)) return res.products
  if (Array.isArray(res.data)) return res.data
  return []
})

// Hitung batas harga dinamis dari produk
const maxPriceLimit = computed(() => {
  if (products.value.length === 0) return 30000000
  const highest = Math.max(...products.value.map((p) => Number(p.price) || 0))
  return Math.max(1000000, Math.ceil(highest / 100000) * 100000)
})

const priceStep = computed(() => {
  return maxPriceLimit.value > 5000000 ? 100000 : 50000
})

// State Filter & Pencarian
const searchQuery = ref('')
const selectedCategory = ref('Semua')
const minPrice = ref<number>(0)
const maxPrice = ref<number>(30000000)
const isPriceFilterActive = ref(false)
const minRating = ref(0)
const onlyInStock = ref(false)
const sortBy = ref('featured')
const isMobileFilterOpen = ref(false)

// Sinkronkan nilai awal slider saat data produk pertama kali masuk
watch(
  maxPriceLimit,
  (newMax) => {
    if (!isPriceFilterActive.value) {
      maxPrice.value = newMax
    } else if (maxPrice.value > newMax) {
      maxPrice.value = newMax
    }
  },
  { immediate: true }
)

const updatePriceFilterState = () => {
  isPriceFilterActive.value = minPrice.value > 0 || maxPrice.value < maxPriceLimit.value
}

const handlePriceSliderChange = (e: Event) => {
  const val = Number((e.target as HTMLInputElement).value)
  maxPrice.value = Math.max(val, minPrice.value)
  updatePriceFilterState()
}

const handleMinPriceInput = (e: Event) => {
  const raw = Number((e.target as HTMLInputElement).value)
  const safeVal = Number.isFinite(raw) ? Math.max(0, Math.min(raw, maxPrice.value)) : 0
  minPrice.value = safeVal
  updatePriceFilterState()
}

const handleMaxPriceInput = (e: Event) => {
  const raw = Number((e.target as HTMLInputElement).value)
  const safeVal = Number.isFinite(raw)
    ? Math.max(minPrice.value, Math.min(raw, maxPriceLimit.value))
    : maxPriceLimit.value
  maxPrice.value = safeVal
  updatePriceFilterState()
}

// State Pagination
const currentPage = ref(1)
const itemsPerPage = ref(6)

// State Modal Quick View Galeri
const quickViewState = ref<{ product: ApiProduct | null; initialIndex: number }>({
  product: null,
  initialIndex: 0,
})

const openQuickView = (product: ApiProduct, activeIndex: number) => {
  quickViewState.value = { product, initialIndex: activeIndex }
}

// Daftar Kategori Dinamis + Jumlah Produk
const categories = computed(() => {
  const counts: Record<string, number> = { Semua: products.value.length }
  for (const item of products.value) {
    if (item.category) {
      counts[item.category] = (counts[item.category] || 0) + 1
    }
  }
  return Object.entries(counts).map(([name, count]) => ({ name, count }))
})

const ratingOptions = [
  { value: 0, label: 'Semua' },
  { value: 3, label: '3.0+' },
  { value: 4, label: '4.0+' },
  { value: 4.5, label: '4.5+' },
  { value: 5, label: '5.0' },
]

// Helper ambil nilai rating valid produk
const getProductRating = (item: ApiProduct) => {
  const parsed = Number(item.rating ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

// 1. Proses Filtering
const filteredProducts = computed(() => {
  return products.value.filter((item) => {
    // Filter pencarian nama / deskripsi / spesifikasi
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const matchName = item.name.toLowerCase().includes(q)
      const matchDesc = (item.description || '').toLowerCase().includes(q)
      const matchSpecs = Array.isArray(item.specs)
        ? item.specs.some((s) => s.toLowerCase().includes(q))
        : false
      if (!matchName && !matchDesc && !matchSpecs) return false
    }

    // Filter kategori
    if (selectedCategory.value !== 'Semua' && item.category !== selectedCategory.value) {
      return false
    }

    // Filter rentang harga (Min & Max via slider / input)
    if (isPriceFilterActive.value) {
      const price = Number(item.price)
      if (price < minPrice.value || price > maxPrice.value) return false
    }

    // Filter rating minimal (hanya lolos jika punya rating >= minRating)
    if (minRating.value > 0) {
      const itemRating = getProductRating(item)
      if (itemRating <= 0 || itemRating < minRating.value) return false
    }

    // Filter stok tersedia
    if (onlyInStock.value && item.stock <= 0) return false

    return true
  })
})

// 2. Proses Sorting
const sortedProducts = computed(() => {
  const list = [...filteredProducts.value]
  switch (sortBy.value) {
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price)
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price)
    case 'rating-desc':
      return list.sort((a, b) => getProductRating(b) - getProductRating(a))
    case 'newest':
      return list.sort((a, b) => b.id - a.id)
    default:
      return list
  }
})

// 3. Proses Pagination
const totalPages = computed(() => Math.max(1, Math.ceil(sortedProducts.value.length / itemsPerPage.value)))

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return sortedProducts.value.slice(start, start + itemsPerPage.value)
})

const showingRange = computed(() => {
  if (sortedProducts.value.length === 0) return { start: 0, end: 0 }
  const start = (currentPage.value - 1) * itemsPerPage.value + 1
  const end = Math.min(currentPage.value * itemsPerPage.value, sortedProducts.value.length)
  return { start, end }
})

// Reset ke halaman 1 setiap kali filter atau jumlah per halaman berubah
watch(
  [searchQuery, selectedCategory, minPrice, maxPrice, isPriceFilterActive, minRating, onlyInStock, sortBy, itemsPerPage],
  () => {
    currentPage.value = 1
  }
)

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const activeFilterCount = computed(() => {
  let count = 0
  if (selectedCategory.value !== 'Semua') count++
  if (isPriceFilterActive.value) count++
  if (minRating.value > 0) count++
  if (onlyInStock.value) count++
  if (searchQuery.value.trim()) count++
  return count
})

const resetFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = 'Semua'
  minPrice.value = 0
  maxPrice.value = maxPriceLimit.value
  isPriceFilterActive.value = false
  minRating.value = 0
  onlyInStock.value = false
  sortBy.value = 'featured'
  currentPage.value = 1
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <!-- Header Banner Katalog -->
    <div class="border-b border-slate-200 bg-white">
      <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav class="flex items-center gap-2 text-xs font-medium text-slate-500">
          <NuxtLink to="/" class="hover:text-indigo-600">Beranda</NuxtLink>
          <span>/</span>
          <span class="font-semibold text-slate-900">Katalog Produk</span>
        </nav>

        <div class="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Semua Katalog Produk
            </h1>
            <p class="mt-2 text-sm text-slate-600 sm:text-base">
              Jelajahi koleksi perangkat audio, wearable, workspace, dan creator gear resmi bergaransi.
            </p>
          </div>

          <!-- Search Bar Utama -->
          <div class="relative w-full md:w-80 lg:w-96">
            <Search class="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari produk atau spesifikasi..."
              class="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-900 transition focus:border-indigo-600 focus:bg-white focus:outline-none"
            />
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              aria-label="Hapus pencarian"
              class="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Konten Utama: Sidebar Filter + Grid Produk -->
    <div class="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <div class="flex flex-col gap-8 lg:flex-row">
        <!-- Tombol Buka Filter di Mobile -->
        <div class="flex items-center justify-between lg:hidden">
          <button
            @click="isMobileFilterOpen = !isMobileFilterOpen"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs"
          >
            <SlidersHorizontal class="h-4 w-4 text-indigo-600" />
            <span>Filter Produk</span>
            <span
              v-if="activeFilterCount > 0"
              class="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white"
            >
              {{ activeFilterCount }}
            </span>
          </button>

          <span class="text-xs font-medium text-slate-500">
            {{ sortedProducts.length }} produk ditemukan
          </span>
        </div>

        <!-- Sidebar Filter (Desktop & Mobile Toggle) -->
        <aside
          :class="[
            'w-full shrink-0 space-y-6 lg:block lg:w-64',
            isMobileFilterOpen ? 'block' : 'hidden',
          ]"
        >
          <div class="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div class="flex items-center gap-2 font-bold text-slate-900">
                <SlidersHorizontal class="h-4 w-4 text-indigo-600" />
                <span>Filter</span>
              </div>
              <button
                v-if="activeFilterCount > 0"
                @click="resetFilters"
                class="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"
              >
                <RotateCcw class="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>

            <!-- Filter Kategori -->
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900">Kategori</h3>
              <ul class="mt-3 space-y-1.5">
                <li v-for="cat in categories" :key="cat.name">
                  <button
                    @click="selectedCategory = cat.name"
                    :class="[
                      'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition',
                      selectedCategory === cat.name
                        ? 'bg-indigo-50 font-bold text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    ]"
                  >
                    <span>{{ cat.name }}</span>
                    <span
                      :class="[
                        'rounded-full px-2 py-0.5 text-xs',
                        selectedCategory === cat.name
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-500',
                      ]"
                    >
                      {{ cat.count }}
                    </span>
                  </button>
                </li>
              </ul>
            </div>

            <!-- Filter Rentang Harga (Slider + Input) -->
            <div class="border-t border-slate-100 pt-5">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900">Rentang Harga</h3>
                <span class="text-xs font-extrabold text-indigo-600">
                  {{ isPriceFilterActive ? `${formatRupiah(minPrice)} – ${formatRupiah(maxPrice)}` : 'Semua Harga' }}
                </span>
              </div>

              <div class="mt-3">
                <input
                  type="range"
                  min="0"
                  :max="maxPriceLimit"
                  :step="priceStep"
                  :value="maxPrice"
                  @input="handlePriceSliderChange"
                  aria-label="Geser batas harga maksimal"
                  class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-black accent-indigo-600 dark:bg-slate-600 dark:accent-white"
                />
                <div class="mt-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500">
                  <span>Rp 0</span>
                  <span>{{ formatRupiah(maxPriceLimit) }}</span>
                </div>
              </div>

              <div class="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label class="mb-1 block text-[11px] font-semibold text-slate-500">Harga Min</label>
                  <input
                    type="number"
                    min="0"
                    :max="maxPrice"
                    :step="priceStep"
                    :value="minPrice"
                    @input="handleMinPriceInput"
                    placeholder="0"
                    class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-[11px] font-semibold text-slate-500">Harga Maks</label>
                  <input
                    type="number"
                    :min="minPrice"
                    :max="maxPriceLimit"
                    :step="priceStep"
                    :value="maxPrice"
                    @input="handleMaxPriceInput"
                    placeholder="Maks"
                    class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <!-- Filter Rating -->
            <div class="border-t border-slate-100 pt-5">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900">Rating Minimal</h3>
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  v-for="opt in ratingOptions"
                  :key="opt.value"
                  type="button"
                  @click="minRating = opt.value"
                  :class="[
                    'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition',
                    minRating === opt.value
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  ]"
                >
                  <template v-if="opt.value === 0">{{ opt.label }}</template>
                  <template v-else>
                    <Star class="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span>{{ opt.label }}</span>
                  </template>
                </button>
              </div>
            </div>

            <!-- Filter Ketersediaan Stok -->
            <div class="border-t border-slate-100 pt-5">
              <label class="flex cursor-pointer items-center justify-between text-sm font-medium text-slate-700">
                <span>Hanya Stok Tersedia</span>
                <input
                  v-model="onlyInStock"
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>
        </aside>

        <!-- Area Kanan: Toolbar Sorting + Grid Produk + Pagination -->
        <div class="flex-1">
          <!-- Toolbar Atas -->
          <div class="mb-6 flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-xs sm:flex-row sm:items-center">
            <p class="text-xs text-slate-600 sm:text-sm">
              Menampilkan <span class="font-bold text-slate-900">{{ showingRange.start }}–{{ showingRange.end }}</span> dari
              <span class="font-bold text-slate-900">{{ sortedProducts.length }}</span> produk
            </p>

            <div class="flex flex-wrap items-center gap-3">
              <!-- Tampilkan Per Halaman -->
              <div class="flex items-center gap-1.5 text-xs text-slate-600">
                <span>Tampil:</span>
                <select
                  v-model.number="itemsPerPage"
                  class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none"
                >
                  <option :value="6">6</option>
                  <option :value="9">9</option>
                  <option :value="12">12</option>
                </select>
              </div>

              <!-- Urutkan -->
              <div class="flex items-center gap-1.5 text-xs text-slate-600">
                <span>Urutkan:</span>
                <select
                  v-model="sortBy"
                  class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none"
                >
                  <option value="featured">Rekomendasi</option>
                  <option value="newest">Terbaru</option>
                  <option value="price-asc">Harga: Terendah</option>
                  <option value="price-desc">Harga: Tertinggi</option>
                  <option value="rating-desc">Rating Tertinggi</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Loading Skeleton -->
          <div
            v-if="pending"
            class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
          >
            <div
              v-for="n in 6"
              :key="n"
              class="animate-pulse overflow-hidden rounded-3xl border border-slate-200 bg-white p-4"
            >
              <div class="aspect-[4/3] w-full rounded-2xl bg-slate-200" />
              <div class="mt-4 h-5 w-2/3 rounded-lg bg-slate-200" />
              <div class="mt-2 h-4 w-full rounded-lg bg-slate-100" />
              <div class="mt-5 h-10 w-full rounded-xl bg-slate-200" />
            </div>
          </div>

          <!-- Empty State jika hasil filter kosong -->
          <div
            v-else-if="paginatedProducts.length === 0"
            class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center"
          >
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <PackageSearch class="h-8 w-8" />
            </div>
            <h3 class="mt-4 text-lg font-bold text-slate-900">Produk tidak ditemukan</h3>
            <p class="mt-1 max-w-md text-sm text-slate-500">
              Tidak ada produk yang cocok dengan kombinasi filter atau kata kunci pencarianmu saat ini.
            </p>
            <button
              @click="resetFilters"
              class="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <RotateCcw class="h-4 w-4" />
              <span>Reset Semua Filter</span>
            </button>
          </div>

          <!-- Grid Produk dengan Carousel Multi-Foto -->
          <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            <ProductGalleryCard
              v-for="product in paginatedProducts"
              :key="product.id"
              :product="product"
              @quick-view="openQuickView"
            />
          </div>

          <!-- Pagination -->
          <div
            v-if="totalPages > 1"
            class="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row"
          >
            <p class="text-xs font-medium text-slate-500">
              Halaman <span class="font-bold text-slate-900">{{ currentPage }}</span> dari
              <span class="font-bold text-slate-900">{{ totalPages }}</span>
            </p>

            <nav aria-label="Pagination" class="flex items-center gap-1.5">
              <button
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                aria-label="Halaman Sebelumnya"
                class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft class="h-4 w-4" />
              </button>

              <button
                v-for="page in totalPages"
                :key="page"
                @click="goToPage(page)"
                :class="[
                  'inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition',
                  currentPage === page
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                ]"
              >
                {{ page }}
              </button>

              <button
                @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                aria-label="Halaman Berikutnya"
                class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight class="h-4 w-4" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Quick View Galeri -->
    <ProductQuickViewModal
      :product="quickViewState.product"
      :initial-index="quickViewState.initialIndex"
      @close="quickViewState.product = null"
    />
  </div>
</template>