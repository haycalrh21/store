<script setup lang="ts">
import { ArrowLeft, Save, Package, Percent, AlertCircle, Loader2 } from 'lucide-vue-next'

interface AdminProduct {
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
}

const route = useRoute()
const { formatRupiah } = useStore()

const productId = computed(() => Number(route.params.id))

// Ambil daftar produk dari API database
const { data: productsData, pending: isLoadingProduct } = await useFetch<AdminProduct[]>(
  '/api/admin/products',
  { default: () => [] }
)

const targetProduct = computed(() =>
  (productsData.value ?? []).find((p) => p.id === productId.value)
)

const categoryOptions = ['Audio', 'Wearable', 'Workspace', 'Aksesoris']
const imageError = ref('')
const submitError = ref('')
const isSaving = ref(false)

const form = ref({
  name: '',
  category: 'Audio',
  price: 0,
  discount: 0,
  stock: 0,
  badge: '',
  images: [] as string[],
  description: '',
  specsText: '',
})

watch(
  targetProduct,
  (item) => {
    if (!item) return
    form.value = {
      name: item.name,
      category: item.category,
      price: item.originalPrice || item.price,
      discount: item.discount || 0,
      stock: item.stock,
      badge: item.badge || '',
      images:
        Array.isArray(item.images) && item.images.length > 0
          ? [...item.images]
          : item.image
            ? [item.image]
            : [],
      description: item.description || '',
      specsText: Array.isArray(item.specs) ? item.specs.join(', ') : '',
    }
  },
  { immediate: true }
)

watch(
  () => form.value.images.length,
  (len) => {
    if (len > 0) imageError.value = ''
  }
)

const discountPercent = computed(() => {
  const raw = Number(form.value.discount) || 0
  return Math.min(Math.max(raw, 0), 99)
})

const discountAmount = computed(() => {
  const base = Number(form.value.price) || 0
  if (discountPercent.value <= 0) return 0
  return Math.round((base * discountPercent.value) / 100)
})

const finalPrice = computed(() => {
  const base = Number(form.value.price) || 0
  return Math.max(base - discountAmount.value, 0)
})

const handleSave = async () => {
  if (!targetProduct.value) return
  const primaryImage = form.value.images[0]
  if (!primaryImage) {
    imageError.value = 'Minimal harus ada 1 foto produk.'
    return
  }

  const specs = form.value.specsText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const hasDiscount = discountPercent.value > 0
  const autoBadge = hasDiscount ? `Diskon ${discountPercent.value}%` : null

  isSaving.value = true
  submitError.value = ''

  try {
    await $fetch(`/api/admin/products/${targetProduct.value.id}`, {
      method: 'PUT',
      body: {
        name: form.value.name,
        category: form.value.category,
        price: finalPrice.value,
        originalPrice: hasDiscount ? Number(form.value.price) : null,
        discount: hasDiscount ? discountPercent.value : null,
        stock: Number(form.value.stock),
        badge: form.value.badge.trim() || autoBadge,
        image: primaryImage,
        images: [...form.value.images],
        description: form.value.description,
        specs: specs.length > 0 ? specs : ['Garansi Resmi 1 Tahun'],
      },
    })

    await navigateTo('/admin/produk')
  } catch (err: any) {
    submitError.value =
      err?.data?.statusMessage || err?.message || 'Gagal menyimpan perubahan produk.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <NuxtLink
        to="/admin/produk"
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
      >
        <ArrowLeft class="h-4 w-4" />
        <span>Kembali ke Daftar Produk</span>
      </NuxtLink>
    </div>

    <div
      v-if="isLoadingProduct && !targetProduct"
      class="rounded-2xl border border-slate-200 bg-white p-14 text-center text-sm font-semibold text-slate-500"
    >
      Memuat detail produk...
    </div>

    <div
      v-else-if="!targetProduct"
      class="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center"
    >
      <Package class="mx-auto h-10 w-10 text-slate-400" />
      <h2 class="mt-3 text-base font-bold text-slate-900">Produk tidak ditemukan</h2>
      <NuxtLink
        to="/admin/produk"
        class="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white"
      >
        Kembali ke Katalog Admin
      </NuxtLink>
    </div>

    <div v-else class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-8">
      <div>
        <h1 class="text-lg font-extrabold text-slate-900 sm:text-xl">Edit Produk #{{ targetProduct.id }}</h1>
        <p class="mt-0.5 text-xs text-slate-500 sm:text-sm">
          Perbarui galeri foto dan detail produk <span class="font-bold text-slate-800">{{ targetProduct.name }}</span>.
        </p>
      </div>

      <div
        v-if="submitError"
        class="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"
      >
        <AlertCircle class="h-4 w-4 shrink-0" />
        <span>{{ submitError }}</span>
      </div>

      <form @submit.prevent="handleSave" class="mt-6 space-y-5">
        <div>
          <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
            Galeri Foto Produk ({{ form.images.length }} Foto)
          </label>
          <ImageDropzone v-model="form.images" :max-files="6" />
          <p
            v-if="imageError"
            class="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600"
          >
            <AlertCircle class="h-4 w-4 shrink-0" />
            <span>{{ imageError }}</span>
          </p>
        </div>

        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Nama Produk</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Kategori</label>
            <select
              v-model="form.category"
              class="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            >
              <option v-for="cat in categoryOptions" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Harga Normal (Rp)</label>
            <input
              v-model.number="form.price"
              type="number"
              min="1000"
              step="1000"
              required
              class="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Diskon (%)</label>
            <div class="relative mt-1.5">
              <input
                v-model.number="form.discount"
                type="number"
                min="0"
                max="99"
                class="w-full rounded-xl border border-slate-300 py-2.5 pl-3.5 pr-10 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
              />
              <Percent class="pointer-events-none absolute right-3.5 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Stok Tersedia</label>
            <input
              v-model.number="form.stock"
              type="number"
              min="0"
              required
              class="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Label Badge</label>
            <input
              v-model="form.badge"
              type="text"
              placeholder="Kosongkan jika tanpa badge"
              class="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>
        </div>

        <div
          v-if="discountPercent > 0"
          class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs sm:text-sm"
        >
          <div class="space-y-0.5">
            <span class="font-bold text-emerald-800">Simulasi Harga Setelah Diskon {{ discountPercent }}%</span>
            <p class="text-xs text-emerald-700">
              Harga normal <span class="line-through">{{ formatRupiah(form.price || 0) }}</span> • Hemat {{ formatRupiah(discountAmount) }}
            </p>
          </div>
          <span class="text-base font-extrabold text-emerald-700 sm:text-lg">
            {{ formatRupiah(finalPrice) }}
          </span>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Spesifikasi Utama (Pisahkan dengan koma)
          </label>
          <input
            v-model="form.specsText"
            type="text"
            class="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Deskripsi Produk</label>
          <textarea
            v-model="form.description"
            rows="3"
            class="mt-1.5 w-full rounded-xl border border-slate-300 p-3.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
          />
        </div>

        <div class="flex flex-col-reverse justify-end gap-3 pt-2 sm:flex-row">
          <NuxtLink
            to="/admin/produk"
            class="rounded-xl border border-slate-300 px-5 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Batal
          </NuxtLink>
          <button
            type="submit"
            :disabled="isSaving"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" />
            <span>{{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>