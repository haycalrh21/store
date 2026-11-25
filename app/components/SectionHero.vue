<script setup lang="ts">
import { ArrowRight, Sparkles, ShieldCheck, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-vue-next'

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
  createdAt?: string
}

const { formatRupiah } = useStore()

const { data: rawProducts } = await useFetch<AdminProduct[]>('/api/admin/products')

const slideThemes = [
  {
    bgColor: 'from-slate-950 via-indigo-950 to-slate-950',
    glowColor: 'bg-indigo-500/20',
  },
  {
    bgColor: 'from-slate-950 via-sky-950 to-slate-950',
    glowColor: 'bg-sky-500/20',
  },
  {
    bgColor: 'from-slate-950 via-violet-950 to-slate-950',
    glowColor: 'bg-violet-500/20',
  },
  {
    bgColor: 'from-slate-950 via-emerald-950 to-slate-950',
    glowColor: 'bg-emerald-500/20',
  },
]

const currentSlideIndex = ref(0)
const isAutoplayActive = ref(true)
const progressValue = ref(0)
const slideDuration = 6500
let progressInterval: ReturnType<typeof setInterval> | null = null

// Ambil maksimal 4 produk terbaru berdasarkan createdAt (atau id terbaru)
const carouselSlides = computed(() => {
  const list = Array.isArray(rawProducts.value) ? [...rawProducts.value] : []

  const latestFour = list
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      if (timeB !== timeA) return timeB - timeA
      return b.id - a.id
    })
    .slice(0, 4)

  return latestFour.map((item, idx) => {
    const theme = slideThemes[idx % slideThemes.length]!
    const upperName = item.name.trim().toUpperCase()
    const words = upperName.split(/\s+/)
    const highlightTitle = words.length > 1 ? words.slice(0, -1).join(' ') : upperName
    const subTitle = words.length > 1 ? words[words.length - 1] : item.category.toUpperCase()

    const primaryImage =
      item.image ||
      (Array.isArray(item.images) && item.images.length > 0 ? item.images[0]! : '')

    const featureList =
      Array.isArray(item.specs) && item.specs.length > 0
        ? item.specs.slice(0, 2)
        : [item.category, 'GARANSI RESMI']

    return {
      ...item,
      image: primaryImage,
      tag: item.badge || `NEW ARRIVAL • ${item.category.toUpperCase()}`,
      highlightTitle,
      subTitle,
      features: featureList,
      bgColor: theme.bgColor,
      glowColor: theme.glowColor,
    }
  })
})

const activeSlide = computed(() => {
  return carouselSlides.value[currentSlideIndex.value] ?? carouselSlides.value[0] ?? null
})

watch(
  () => carouselSlides.value.length,
  (len) => {
    if (len > 0 && currentSlideIndex.value >= len) {
      currentSlideIndex.value = 0
    }
  }
)

const nextSlide = () => {
  const total = carouselSlides.value.length
  if (total === 0) return
  currentSlideIndex.value = (currentSlideIndex.value + 1) % total
  resetProgress()
}

const prevSlide = () => {
  const total = carouselSlides.value.length
  if (total === 0) return
  currentSlideIndex.value = (currentSlideIndex.value - 1 + total) % total
  resetProgress()
}

const goToSlide = (idx: number) => {
  currentSlideIndex.value = idx
  resetProgress()
}

const startProgress = () => {
  if (carouselSlides.value.length <= 1) return
  const stepTime = 50
  const totalSteps = slideDuration / stepTime
  let currentStep = 0

  progressInterval = setInterval(() => {
    if (isAutoplayActive.value && carouselSlides.value.length > 1) {
      currentStep++
      progressValue.value = (currentStep / totalSteps) * 100
      if (currentStep >= totalSteps) {
        nextSlide()
      }
    }
  }, stepTime)
}

const resetProgress = () => {
  if (progressInterval) clearInterval(progressInterval)
  progressValue.value = 0
  if (isAutoplayActive.value) startProgress()
}

const toggleAutoplay = () => {
  isAutoplayActive.value = !isAutoplayActive.value
  if (isAutoplayActive.value) {
    startProgress()
  } else if (progressInterval) {
    clearInterval(progressInterval)
  }
}

onMounted(() => {
  startProgress()
})

onUnmounted(() => {
  if (progressInterval) clearInterval(progressInterval)
})
</script>

<template>
  <section
    v-if="activeSlide"
    id="hero"
    class="relative min-h-[580px] w-full overflow-hidden bg-gradient-to-br transition-colors duration-1000 lg:min-h-[680px]"
    :class="activeSlide.bgColor"
  >
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        class="absolute right-10 top-1/4 h-[300px] w-[300px] rounded-full opacity-40 blur-[120px] transition-all duration-1000 lg:right-1/4 lg:h-[550px] lg:w-[550px]"
        :class="activeSlide.glowColor"
      />
    </div>

    <div class="relative z-10 mx-auto flex min-h-[580px] max-w-7xl flex-col justify-center px-4 py-14 sm:px-6 lg:min-h-[680px] lg:px-8 lg:py-20">
      <div class="grid items-center gap-10 lg:grid-cols-12">
        <!-- Teks Kiri -->
        <div class="z-20 space-y-6 text-center lg:col-span-7 lg:text-left">
          <div class="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-300">
            <Sparkles class="h-3.5 w-3.5 animate-pulse" />
            <span>{{ activeSlide.tag }}</span>
          </div>

          <h1 class="text-4xl font-black leading-[0.95] tracking-tighter text-white sm:text-6xl lg:text-7xl">
            <span class="block bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              {{ activeSlide.highlightTitle }}
            </span>
            <span class="mt-2 block text-indigo-400">
              {{ activeSlide.subTitle }}
            </span>
          </h1>

          <p class="mx-auto max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base lg:mx-0 lg:text-lg">
            {{ activeSlide.description || 'Produk terbaru dengan kualitas unggulan dan garansi resmi.' }}
          </p>

          <div class="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
            <NuxtLink
              :to="`/products/${activeSlide.id}`"
              class="group inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-7 py-4 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/35 transition-all duration-300 hover:-translate-y-1 hover:bg-indigo-500"
            >
              <span>LIHAT PRODUK</span>
              <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </NuxtLink>

            <div class="flex flex-col items-center sm:items-start">
              <span
                v-if="activeSlide.originalPrice && activeSlide.originalPrice > activeSlide.price"
                class="text-xs font-semibold text-slate-400 line-through"
              >
                {{ formatRupiah(activeSlide.originalPrice) }}
              </span>
              <span class="text-xl font-black text-indigo-300">
                {{ formatRupiah(activeSlide.price) }}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-3 pt-3 text-xs font-semibold text-slate-400 lg:justify-start">
            <div class="flex items-center gap-2">
              <ShieldCheck class="h-4 w-4 text-indigo-400" />
              <span>{{ activeSlide.category.toUpperCase() }}</span>
            </div>
            <div
              v-for="spec in activeSlide.features"
              :key="spec"
              class="rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-[11px] uppercase text-slate-200"
            >
              {{ spec }}
            </div>
          </div>
        </div>

        <!-- Visual Produk Kanan -->
        <div class="relative flex justify-center lg:col-span-5 lg:justify-end">
          <div class="group relative flex aspect-square w-72 items-center justify-center sm:w-96 lg:w-[410px]">
            <div class="absolute inset-0 scale-95 animate-[spin_40s_linear_infinite] rounded-full border border-indigo-500/20" />
            <NuxtLink :to="`/products/${activeSlide.id}`" class="relative block h-full w-full">
              <img
                :src="activeSlide.image"
                :alt="activeSlide.name"
                class="h-full w-full rounded-3xl border border-slate-700/80 object-cover shadow-2xl transition-all duration-500 group-hover:scale-105"
              />
              <div class="pointer-events-none absolute -right-2 -top-4 rounded-2xl border border-white/15 bg-slate-900/80 px-4 py-3 shadow-xl backdrop-blur-md">
                <span class="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {{ activeSlide.discount ? `HEMAT ${activeSlide.discount}%` : 'LATEST RELEASE' }}
                </span>
                <span class="mt-0.5 block text-xs font-black uppercase text-white">
                  {{ activeSlide.features[0] }}
                </span>
              </div>
              <div class="pointer-events-none absolute -left-4 bottom-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/80 px-4 py-3 shadow-xl backdrop-blur-md">
                <span class="block text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                  {{ activeSlide.stock > 0 ? 'STOK TERSEDIA' : 'STATUS STOK' }}
                </span>
                <span class="mt-0.5 block text-xs font-black text-white">
                  {{ activeSlide.stock > 0 ? `${activeSlide.stock} UNIT` : 'STOK HABIS' }}
                </span>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Navigasi Bawah & Up Next -->
      <div
        v-if="carouselSlides.length > 1"
        class="mt-14 flex flex-col gap-6 border-t border-slate-800/80 pt-6 md:flex-row md:items-center md:justify-between"
      >
        <div class="flex items-center justify-center gap-5 md:justify-start">
          <div class="text-sm font-bold text-slate-500">
            <span class="text-3xl font-black text-white">0{{ currentSlideIndex + 1 }}</span> / 0{{ carouselSlides.length }}
          </div>

          <button
            @click="toggleAutoplay"
            aria-label="Toggle Autoplay"
            class="relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 transition-colors hover:border-indigo-500"
          >
            <svg class="absolute inset-0 h-full w-full -rotate-90 transform">
              <circle cx="24" cy="24" r="18" stroke="rgba(99, 102, 241, 0.25)" stroke-width="2" fill="transparent" />
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="#6366f1"
                stroke-width="2"
                fill="transparent"
                :stroke-dasharray="113"
                :stroke-dashoffset="113 - (113 * progressValue) / 100"
              />
            </svg>
            <Pause v-if="isAutoplayActive" class="h-4 w-4 text-indigo-400" />
            <Play v-else class="h-4 w-4 text-indigo-400" />
          </button>

          <div class="flex items-center gap-2">
            <button
              @click="prevSlide"
              aria-label="Slide Sebelumnya"
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <ChevronLeft class="h-5 w-5" />
            </button>
            <button
              @click="nextSlide"
              aria-label="Slide Berikutnya"
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <ChevronRight class="h-5 w-5" />
            </button>
          </div>
        </div>

        <!-- Up Next Cards (Maksimal 4 Produk Terbaru) -->
        <div class="flex flex-col gap-2">
          <span class="text-center text-[10px] font-bold tracking-wider text-slate-400 md:text-right">UP NEXT</span>
          <div class="flex flex-wrap justify-center gap-3">
            <button
              v-for="(slide, idx) in carouselSlides"
              :key="slide.id"
              @click="goToSlide(idx)"
              :class="[
                'flex w-44 items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-300',
                idx === currentSlideIndex
                  ? 'border-indigo-500 bg-slate-900 shadow-md'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700',
              ]"
            >
              <img :src="slide.image" :alt="slide.name" class="h-9 w-9 shrink-0 rounded-lg object-cover" />
              <div class="truncate">
                <p class="text-[9px] font-bold uppercase tracking-wide text-indigo-400">Slide 0{{ idx + 1 }}</p>
                <p class="mt-0.5 truncate text-xs font-black capitalize text-white">{{ slide.name }}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>