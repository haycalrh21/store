<script setup lang="ts">
import { ArrowLeft, Save, AlertCircle, Percent } from 'lucide-vue-next'

const { formatRupiah } = useStore()

const form = ref({
  name: '',
  category: 'Audio',
  price: 500000,
  discount: 0,
  stock: 10,
  badge: '',
  images: [] as string[],
  description: '',
  specsText: 'Garansi Resmi 1 Tahun, Pengiriman Cepat, Kualitas Original',
})

const imageError = ref('')
const isSubmitting = ref(false)
const categoryOptions = ['Audio', 'Wearable', 'Workspace', 'Aksesoris']

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

watch(
  () => form.value.images.length,
  (len) => {
    if (len > 0) imageError.value = ''
  },
)

// src bisa berupa data:, blob:, atau http (kalau sudah ter-upload)
async function uploadImage(src: string): Promise<string> {
  if (src.startsWith('http')) return src

  const blob = await (await fetch(src)).blob()
  const body = new FormData()
  body.append('file', new File([blob], 'produk', { type: blob.type }))

  const res = await $fetch<{ url: string }>('/api/admin/upload', { method: 'POST', body })
  return res.url
}

const handleSubmit = async () => {
  if (!form.value.images.length) {
    imageError.value = 'Silakan upload minimal 1 foto produk terlebih dahulu.'
    return
  }

  isSubmitting.value = true
  try {
    const urls: string[] = []
    for (const src of form.value.images) urls.push(await uploadImage(src))

    await $fetch('/api/admin/products', {
      method: 'POST',
      body: {
        name: form.value.name,
        category: form.value.category,
        price: form.value.price, // harga normal, server yang menghitung diskon
        discount: form.value.discount,
        stock: form.value.stock,
        badge: form.value.badge.trim(),
        images: urls,
        description: form.value.description,
        specs: form.value.specsText.split(',').map((s) => s.trim()).filter(Boolean),
      },
    })

    await navigateTo('/admin/produk')
  } catch (e: any) {
    imageError.value = e?.data?.statusMessage || 'Gagal menyimpan produk. Coba lagi.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <NuxtLink
        to="/admin/produk"
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
      >
        <ArrowLeft class="h-4 w-4" />
        <span>Kembali ke Daftar Produk</span>
      </NuxtLink>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-8">
      <h1 class="text-lg font-extrabold text-slate-900 sm:text-xl">Tambah Produk Baru</h1>
      <p class="mt-1 text-xs text-slate-500 sm:text-sm">
        Lengkapi informasi dan upload beberapa foto produk yang akan ditampilkan ke katalog pembeli.
      </p>

      <form @submit.prevent="handleSubmit" class="mt-6 space-y-5">
        <!-- Upload Banyak Foto Produk (Drag & Drop) -->
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
              placeholder="Contoh: UltraSound Wireless Speaker"
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
                placeholder="0"
                class="w-full rounded-xl border border-slate-300 py-2.5 pl-3.5 pr-10 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
              />
              <Percent class="pointer-events-none absolute right-3.5 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Stok Awal</label>
            <input
              v-model.number="form.stock"
              type="number"
              min="0"
              required
              class="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Label Badge (Opsional)</label>
            <input
              v-model="form.badge"
              type="text"
              placeholder="Kosongkan untuk otomatis Diskon %"
              class="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>
        </div>

        <!-- Ringkasan Kalkulasi Harga & Diskon -->
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
            placeholder="Bluetooth 5.4, Baterai 40 Jam, USB-C Fast Charging"
            class="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Deskripsi Produk</label>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="Jelaskan keunggulan dan detail produk..."
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
            :disabled="isSubmitting"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save class="h-4 w-4" />
            <span>{{ isSubmitting ? 'Menyimpan...' : 'Simpan Produk' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>