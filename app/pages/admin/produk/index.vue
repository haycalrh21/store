<script setup lang="ts">
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  AlertCircle,
} from 'lucide-vue-next'

interface CategoryItem {
  id: number
  name: string
  slug: string
  productCount?: number
}

const { formatRupiah } = useStore()

// Ambil data produk & daftar kategori dari database
const { data, status, error, refresh } = await useFetch('/api/admin/products')
const { data: rawCategories } = await useFetch<CategoryItem[]>('/api/admin/categories', {
  default: () => [],
})

const products = computed(() => data.value ?? [])
type ProductItem = (typeof products.value)[number]

const searchQuery = ref('')
const selectedCategory = ref('Semua')

const categories = computed(() => {
  const map = new Map<string, string>()

  // Masukkan semua kategori resmi dari tabel categories
  if (Array.isArray(rawCategories.value)) {
    for (const c of rawCategories.value) {
      const name = String(c?.name || '').trim()
      if (name) map.set(name.toLowerCase(), name)
    }
  }

  // Sertakan juga kategori dari produk yang ada agar produk lama tetap terfilter
  for (const p of products.value) {
    const name = String(p.category || '').trim()
    if (name && !map.has(name.toLowerCase())) {
      map.set(name.toLowerCase(), name)
    }
  }

  return ['Semua', ...Array.from(map.values())]
})

const getCategoryCount = (cat: string) => {
  if (cat === 'Semua') return products.value.length
  return products.value.filter(
    (p) => String(p.category || '').trim().toLowerCase() === cat.toLowerCase()
  ).length
}

const filteredProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return products.value.filter((item) => {
    const matchCategory =
      selectedCategory.value === 'Semua' ||
      String(item.category || '').trim().toLowerCase() === selectedCategory.value.toLowerCase()
    const matchQuery =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    return matchCategory && matchQuery
  })
})

// Modal Konfirmasi Hapus
const productToDelete = ref<ProductItem | null>(null)
const isDeleting = ref(false)
const deleteError = ref('')

const confirmDelete = async () => {
  if (!productToDelete.value) return

  isDeleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/admin/products/${productToDelete.value.id}`, { method: 'DELETE' })
    productToDelete.value = null
    await refresh()
  } catch (e: any) {
    deleteError.value = e?.data?.statusMessage || 'Gagal menghapus produk. Coba lagi.'
  } finally {
    isDeleting.value = false
  }
}

const closeDeleteModal = () => {
  productToDelete.value = null
  deleteError.value = ''
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header Halaman Produk -->
    <div
      class="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:p-6">
      <div>
        <h1 class="text-xl font-extrabold text-slate-900 dark:text-white">Kelola Produk</h1>
        <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
          Tambah produk baru, perbarui harga dan stok, atau hapus produk dari katalog.
        </p>
      </div>

      <NuxtLink to="/admin/produk/tambah"
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 sm:text-sm">
        <Plus class="h-4 w-4" />
        <span>Tambah Produk</span>
      </NuxtLink>
    </div>

    <!-- Bar Pencarian & Filter Kategori dari API -->
    <!-- Bar Pencarian & Dropdown Filter Kategori -->
    <div
      class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative flex-1 sm:max-w-md">
        <Search class="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama produk..."
          class="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-4 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm"
        />
      </div>

      <div class="flex items-center gap-2 sm:w-56">
        <select
          v-model="selectedCategory"
          aria-label="Filter kategori produk"
          class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:text-sm"
        >
          <option v-for="cat in categories" :key="cat" :value="cat">
            {{ cat === 'Semua' ? `Semua Kategori (${products.length})` : `${cat} (${getCategoryCount(cat)})` }}
          </option>
        </select>
      </div>
    </div>

    <!-- Gagal Memuat Data -->
    <div v-if="error"
      class="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
      <span>Gagal memuat produk dari database.</span>
      <button @click="refresh()" class="rounded-lg bg-rose-600 px-3 py-1.5 font-bold text-white hover:bg-rose-700">
        Coba lagi
      </button>
    </div>

    <!-- Loading -->
    <div v-else-if="status === 'pending' && !data"
      class="rounded-2xl border border-slate-200 bg-white p-14 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
      Memuat produk...
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredProducts.length === 0"
      class="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center dark:border-slate-700 dark:bg-slate-900">
      <Package class="mx-auto h-10 w-10 text-slate-400" />
      <h3 class="mt-3 text-base font-bold text-slate-900 dark:text-white">Produk tidak ditemukan</h3>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Coba ubah kata kunci pencarian, pilih kategori lain, atau tambah produk baru.
      </p>
    </div>

    <!-- Daftar Produk (Tabel di Desktop, Kartu di Mobile) -->
    <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <!-- Tabel Desktop -->
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full text-left text-sm">
          <thead
            class="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th class="px-5 py-3.5">Produk</th>
              <th class="px-4 py-3.5">Kategori</th>
              <th class="px-4 py-3.5">Harga</th>
              <th class="px-4 py-3.5">Stok</th>
              <th class="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="item in filteredProducts" :key="item.id" class="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
              <td class="px-5 py-4">
                <div class="flex items-center gap-3.5">
                  <img v-if="item.image" :src="item.image" :alt="item.name"
                    class="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700" @error="(e) => {
                      const img = e.target as HTMLImageElement | null
                      if (img) img.style.display = 'none'
                    }" />
                  <div class="min-w-0">
                    <p class="font-bold text-slate-900 dark:text-white">{{ item.name }}</p>
                    <span v-if="item.badge"
                      class="mt-0.5 inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      {{ item.badge }}
                    </span>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4">
                <span class="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {{ item.category }}
                </span>
              </td>
              <td class="px-4 py-4 font-bold text-slate-900 dark:text-white">
                {{ formatRupiah(item.price) }}
              </td>
              <td class="px-4 py-4">
                <span :class="[
                  'rounded-lg px-2.5 py-1 text-xs font-bold',
                  item.stock <= 10 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
                ]">
                  {{ item.stock }} unit
                </span>
              </td>
              <td class="px-5 py-4 text-right">
                <div class="inline-flex items-center gap-2">
                  <NuxtLink :to="`/admin/produk/edit/${item.id}`"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <Pencil class="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </NuxtLink>
                  <button @click="productToDelete = item"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-400">
                    <Trash2 class="h-3.5 w-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Tampilan Kartu Responsif untuk Mobile -->
      <div class="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
        <div v-for="item in filteredProducts" :key="item.id" class="space-y-3 p-4">
          <div class="flex items-center gap-3.5">
            <img :src="item.image" :alt="item.name" style="width: 56px; height: 56px;"
              class="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-slate-900 dark:text-white">{{ item.name }}</p>
              <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ item.category }} • Stok {{ item.stock }}</p>
              <p class="mt-1 text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{{ formatRupiah(item.price) }}</p>
            </div>
          </div>

          <div class="flex gap-2">
            <NuxtLink :to="`/admin/produk/edit/${item.id}`"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">
              <Pencil class="h-3.5 w-3.5" />
              <span>Edit Produk</span>
            </NuxtLink>
            <button @click="productToDelete = item"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-400">
              <Trash2 class="h-3.5 w-3.5" />
              <span>Hapus</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Konfirmasi Hapus Produk -->
    <div v-if="productToDelete" @click.self="closeDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div class="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50">
          <AlertCircle class="h-6 w-6" />
        </div>
        <h3 class="mt-4 text-base font-extrabold text-slate-900 dark:text-white">Hapus Produk Ini?</h3>
        <p class="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Produk <span class="font-bold text-slate-800 dark:text-slate-200">{{ productToDelete.name }}</span> akan dihapus permanen dari
          katalog toko.
        </p>

        <p v-if="deleteError" class="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs font-semibold text-rose-600">
          {{ deleteError }}
        </p>

        <div class="mt-6 flex gap-3">
          <button @click="closeDeleteModal" :disabled="isDeleting"
            class="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300">
            Batal
          </button>
          <button @click="confirmDelete" :disabled="isDeleting"
            class="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">
            {{ isDeleting ? 'Menghapus...' : 'Ya, Hapus' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>