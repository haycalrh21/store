<script setup lang="ts">
import { FolderTree, Plus, Search, Trash2, Package, Pencil, Check, X, Loader2 } from 'lucide-vue-next'

interface CategoryItem {
  id: number
  name: string
  slug: string
  productCount: number
}

const { showToast } = useStore()

const { data: rawCategories, refresh } = await useFetch<CategoryItem[]>('/api/admin/categories', {
  default: () => [],
})

const categories = computed(() => (Array.isArray(rawCategories.value) ? rawCategories.value : []))

const searchQuery = ref('')
const newCategoryName = ref('')
const isSubmitting = ref(false)

const editingId = ref<number | null>(null)
const editingName = ref('')
const isUpdating = ref(false)

const filteredCategories = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return categories.value
  return categories.value.filter(
    (c) => c.name.toLowerCase().includes(q) || c.slug.includes(q)
  )
})

// POST: Tambah kategori baru
const handleAddCategory = async () => {
  const name = newCategoryName.value.trim()
  if (!name) return

  isSubmitting.value = true
  try {
    await $fetch('/api/admin/categories', {
      method: 'POST',
      body: { name },
    })
    await refresh()
    newCategoryName.value = ''
    showToast(`Kategori "${name}" berhasil ditambahkan!`)
  } catch (err: any) {
    showToast(err?.data?.statusMessage || 'Gagal menambahkan kategori.')
  } finally {
    isSubmitting.value = false
  }
}

// Mulai mode edit inline
const startEdit = (cat: CategoryItem) => {
  editingId.value = cat.id
  editingName.value = cat.name
}

const cancelEdit = () => {
  editingId.value = null
  editingName.value = ''
}

// PUT: Simpan perubahan nama kategori
const handleUpdateCategory = async (cat: CategoryItem) => {
  const name = editingName.value.trim()
  if (!name) return
  if (name === cat.name) {
    cancelEdit()
    return
  }

  isUpdating.value = true
  try {
    await $fetch(`/api/admin/categories/${cat.id}`, {
      method: 'PUT',
      body: { name },
    })
    await refresh()
    cancelEdit()
    showToast(`Kategori diperbarui menjadi "${name}".`)
  } catch (err: any) {
    showToast(err?.data?.statusMessage || 'Gagal memperbarui kategori.')
  } finally {
    isUpdating.value = false
  }
}

// DELETE: Hapus kategori
const handleRemoveCategory = async (cat: CategoryItem) => {
  if (cat.productCount > 0) {
    showToast(`Kategori "${cat.name}" masih dipakai oleh ${cat.productCount} produk.`)
    return
  }

  try {
    await $fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' })
    await refresh()
    showToast(`Kategori "${cat.name}" berhasil dihapus.`)
  } catch (err: any) {
    showToast(err?.data?.statusMessage || 'Gagal menghapus kategori.')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:p-6">
      <div>
        <h1 class="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">Kelola Kategori</h1>
        <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
          Tambah, ubah, atau hapus kategori katalog produk di database.
        </p>
      </div>

      <span class="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
        <FolderTree class="h-4 w-4" />
        <span>{{ categories.length }} Kategori</span>
      </span>
    </div>

    <!-- Form Tambah & Pencarian -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <form
        @submit.prevent="handleAddCategory"
        class="flex gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-7"
      >
        <input
          v-model="newCategoryName"
          type="text"
          placeholder="Nama kategori baru (contoh: Audio, Medis, Aksesoris)..."
          class="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm"
        />
        <button
          type="submit"
          :disabled="isSubmitting || !newCategoryName.trim()"
          class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 sm:text-sm"
        >
          <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin" />
          <Plus v-else class="h-4 w-4" />
          <span>Tambah</span>
        </button>
      </form>

      <div class="relative flex items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
        <Search class="pointer-events-none absolute left-7 h-4 w-4 text-slate-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama kategori..."
          class="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-10 pr-4 text-xs text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:text-sm"
        />
      </div>
    </div>

    <!-- Daftar Kategori -->
    <div
      v-if="filteredCategories.length === 0"
      class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"
    >
      <FolderTree class="mx-auto h-10 w-10 text-slate-400" />
      <p class="mt-3 text-sm font-bold text-slate-900 dark:text-white">Belum ada kategori ditemukan</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="cat in filteredCategories"
        :key="cat.id"
        class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      >
        <!-- Mode Edit -->
        <div v-if="editingId === cat.id" class="flex flex-1 items-center gap-2">
          <input
            v-model="editingName"
            type="text"
            @keyup.enter="handleUpdateCategory(cat)"
            @keyup.esc="cancelEdit"
            class="w-full rounded-xl border border-indigo-400 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-900 focus:outline-none dark:bg-slate-800 dark:text-white"
          />
          <button
            type="button"
            :disabled="isUpdating"
            @click="handleUpdateCategory(cat)"
            aria-label="Simpan kategori"
            class="rounded-xl bg-emerald-600 p-2 text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check class="h-4 w-4" />
          </button>
          <button
            type="button"
            @click="cancelEdit"
            aria-label="Batal edit"
            class="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Mode Tampil -->
        <template v-else>
          <div class="min-w-0">
            <p class="truncate text-sm font-extrabold text-slate-900 dark:text-white">{{ cat.name }}</p>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">/{{ cat.slug }}</p>
            <div class="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Package class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{{ cat.productCount }} Produk</span>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              @click="startEdit(cat)"
              aria-label="Edit kategori"
              class="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <Pencil class="h-4 w-4" />
            </button>

            <button
              type="button"
              @click="handleRemoveCategory(cat)"
              aria-label="Hapus kategori"
              class="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-400"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>