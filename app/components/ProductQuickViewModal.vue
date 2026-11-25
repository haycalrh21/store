<script setup lang="ts">
import {
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  CheckCircle2,
  Package,
} from 'lucide-vue-next'
import type { ApiProduct } from '~/components/ProductGalleryCard.vue'

const props = defineProps<{
  product: ApiProduct | null
  initialIndex?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { formatRupiah, addToCart } = useStore()
const activeSlide = ref(0)

const imagesList = computed<string[]>(() => {
  if (!props.product) return []
  const list = Array.isArray(props.product.images)
    ? props.product.images.filter((url) => typeof url === 'string' && url.trim().length > 0)
    : []
  if (props.product.image && !list.includes(props.product.image)) {
    return [props.product.image, ...list]
  }
  return list
})

watch(
  () => [props.product, props.initialIndex] as const,
  ([prod, idx]) => {
    if (prod) {
      activeSlide.value = idx ?? 0
    }
  },
  { immediate: true }
)

const prevImage = () => {
  const len = imagesList.value.length
  if (len <= 1) return
  activeSlide.value = (activeSlide.value - 1 + len) % len
}

const nextImage = () => {
  const len = imagesList.value.length
  if (len <= 1) return
  activeSlide.value = (activeSlide.value + 1) % len
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!props.product) return
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowLeft') prevImage()
  if (e.key === 'ArrowRight') nextImage()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))

const handleOrder = () => {
  if (!props.product) return
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
    image: imagesList.value[0] || props.product.image,
    images: imagesList.value,
    badge: props.product.badge ?? undefined,
    description: props.product.description || '',
    specs: props.product.specs ?? [],
  })
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="product"
        @click.self="emit('close')"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
      >
        <div class="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
          <button
            type="button"
            @click="emit('close')"
            aria-label="Tutup modal"
            class="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X class="h-5 w-5" />
          </button>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-12">
            <!-- Kiri: Galeri Foto Utama & Thumbnail -->
            <div class="space-y-3 md:col-span-7">
              <div class="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <img
                  :src="imagesList[activeSlide] || product.image"
                  :alt="product.name"
                  class="h-full w-full object-cover transition-all duration-300"
                />

                <template v-if="imagesList.length > 1">
                  <button
                    type="button"
                    @click="prevImage"
                    class="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur-md transition hover:scale-105 hover:bg-white"
                  >
                    <ChevronLeft class="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    @click="nextImage"
                    class="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur-md transition hover:scale-105 hover:bg-white"
                  >
                    <ChevronRight class="h-5 w-5" />
                  </button>
                </template>
              </div>

              <!-- Strip Thumbnail -->
              <div v-if="imagesList.length > 1" class="flex gap-2.5 overflow-x-auto pb-1">
                <button
                  v-for="(img, idx) in imagesList"
                  :key="idx"
                  type="button"
                  @click="activeSlide = idx"
                  :class="[
                    'h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                    idx === activeSlide
                      ? 'border-indigo-600 ring-2 ring-indigo-100'
                      : 'border-slate-200 opacity-65 hover:opacity-100',
                  ]"
                >
                  <img :src="img" :alt="`Preview ${idx + 1}`" class="h-full w-full object-cover" />
                </button>
              </div>
            </div>

            <!-- Kanan: Spesifikasi & Harga -->
            <div class="flex flex-col justify-between md:col-span-5">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                    {{ product.category }}
                  </span>
                  <span
                    v-if="product.badge"
                    class="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white"
                  >
                    {{ product.badge }}
                  </span>
                </div>

                <h2 class="mt-3 text-xl font-extrabold capitalize text-slate-900 sm:text-2xl">
                  {{ product.name }}
                </h2>

                <div class="mt-3 rounded-2xl bg-slate-50 p-3.5">
                  <div v-if="product.originalPrice && product.originalPrice > product.price" class="flex items-center gap-2">
                    <span class="text-xs text-slate-400 line-through">
                      {{ formatRupiah(product.originalPrice) }}
                    </span>
                    <span
                      v-if="product.discount"
                      class="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-extrabold text-rose-600"
                    >
                      Hemat {{ product.discount }}%
                    </span>
                  </div>
                  <p class="mt-0.5 text-2xl font-extrabold text-indigo-600">
                    {{ formatRupiah(product.price) }}
                  </p>
                </div>

                <p class="mt-4 text-xs leading-relaxed text-slate-600 sm:text-sm">
                  {{ product.description }}
                </p>

                <!-- Daftar Spesifikasi -->
                <div v-if="product.specs && product.specs.length > 0" class="mt-4 space-y-2">
                  <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Keunggulan & Spesifikasi</p>
                  <ul class="space-y-1.5">
                    <li
                      v-for="(spec, i) in product.specs"
                      :key="i"
                      class="flex items-center gap-2 text-xs font-medium text-slate-700"
                    >
                      <CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{{ spec }}</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div class="mt-6 space-y-2.5 border-t border-slate-100 pt-4">
                <div class="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Package class="h-4 w-4 text-indigo-600" />
                  <span>Tersedia {{ product.stock }} unit siap kirim</span>
                </div>

                <button
                  type="button"
                  :disabled="product.stock <= 0"
                  @click="handleOrder"
                  class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:bg-slate-300"
                >
                  <ShoppingCart class="h-4 w-4" />
                  <span>{{ product.stock > 0 ? 'Masukkan Keranjang' : 'Stok Habis' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>