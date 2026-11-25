<script setup lang="ts">
import { Upload, Trash2, Plus, Star, AlertCircle } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    maxFiles?: number
  }>(),
  {
    maxFiles: 6,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const dropzoneRef = ref<HTMLElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const isProcessing = ref(false)
const errorMessage = ref('')

const remainingSlots = computed(() => Math.max(props.maxFiles - props.modelValue.length, 0))

const optimizeImageToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const maxDimension = 900
        let { width, height } = img

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(String(reader.result))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        resolve(canvas.toDataURL(outputMime, 0.85))
      }
      img.onerror = () => reject(new Error('Gagal memproses gambar.'))
      img.src = String(reader.result)
    }
    reader.onerror = () => reject(new Error('Gagal membaca file.'))
    reader.readAsDataURL(file)
  })
}

const processFiles = async (fileList: FileList | File[] | null | undefined) => {
  if (!fileList || fileList.length === 0) return
  errorMessage.value = ''

  if (remainingSlots.value <= 0) {
    errorMessage.value = `Maksimal ${props.maxFiles} foto per produk.`
    return
  }

  const incoming = Array.from(fileList)
  const validImages = incoming.filter((f) => f.type.startsWith('image/'))

  if (validImages.length === 0) {
    errorMessage.value = 'Format file tidak didukung. Pilih gambar JPG, PNG, atau WebP.'
    return
  }

  const maxBytes = 5 * 1024 * 1024
  const underLimit = validImages.filter((f) => f.size <= maxBytes)
  if (underLimit.length < validImages.length) {
    errorMessage.value = 'Sebagian gambar dilewati karena ukurannya melebihi 5 MB.'
  }

  const filesToProcess = underLimit.slice(0, remainingSlots.value)
  if (underLimit.length > remainingSlots.value) {
    errorMessage.value = `Hanya ${remainingSlots.value} foto pertama yang ditambahkan (maksimal ${props.maxFiles} foto).`
  }

  if (filesToProcess.length === 0) return

  try {
    isProcessing.value = true
    const encodedList = await Promise.all(filesToProcess.map((file) => optimizeImageToDataUrl(file)))
    emit('update:modelValue', [...props.modelValue, ...encodedList])
  } catch {
    errorMessage.value = 'Terjadi kesalahan saat memproses salah satu gambar.'
  } finally {
    isProcessing.value = false
  }
}

const handleDragEnter = () => {
  isDragging.value = true
}

const handleDragOver = () => {
  isDragging.value = true
}

const handleDragLeave = (e: DragEvent) => {
  const nextTarget = e.relatedTarget as Node | null
  if (dropzoneRef.value && nextTarget && dropzoneRef.value.contains(nextTarget)) {
    return
  }
  isDragging.value = false
}

const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  processFiles(e.dataTransfer?.files)
}

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  processFiles(input.files)
  input.value = ''
}

const triggerFilePicker = () => {
  if (remainingSlots.value <= 0) {
    errorMessage.value = `Maksimal ${props.maxFiles} foto per produk.`
    return
  }
  fileInputRef.value?.click()
}

const removeImageAt = (index: number) => {
  const updated = props.modelValue.filter((_, idx) => idx !== index)
  errorMessage.value = ''
  emit('update:modelValue', updated)
}

const setAsPrimary = (index: number) => {
  if (index <= 0 || index >= props.modelValue.length) return
  const target = props.modelValue[index]
  if (!target) return
  const rest = props.modelValue.filter((_, idx) => idx !== index)
  emit('update:modelValue', [target, ...rest])
}
</script>

<template>
  <div class="space-y-3">
    <input
      ref="fileInputRef"
      type="file"
      multiple
      accept="image/png,image/jpeg,image/webp"
      class="hidden"
      @change="handleFileSelect"
    />

    <!-- Area Dropzone Utama -->
    <div
      ref="dropzoneRef"
      role="button"
      tabindex="0"
      @click="triggerFilePicker"
      @keydown.enter.prevent="triggerFilePicker"
      @keydown.space.prevent="triggerFilePicker"
      @dragenter.prevent="handleDragEnter"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
      :class="[
        'group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-7 text-center transition-all',
        isDragging
          ? 'border-indigo-600 bg-indigo-50/80 ring-4 ring-indigo-100'
          : 'border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-slate-50',
      ]"
    >
      <div
        :class="[
          'flex h-12 w-12 items-center justify-center rounded-2xl transition',
          isDragging
            ? 'scale-110 bg-indigo-600 text-white'
            : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
        ]"
      >
        <Upload class="h-6 w-6" />
      </div>

      <p class="mt-3 text-sm font-bold text-slate-900">
        <span v-if="isProcessing">Memproses gambar...</span>
        <span v-else-if="isDragging">Lepaskan semua gambar di sini</span>
        <span v-else>
          Tarik & lepaskan beberapa foto di sini, atau
          <span class="text-indigo-600 underline">pilih banyak file</span>
        </span>
      </p>
      <p class="mt-1 text-xs text-slate-500">
        Format JPG, PNG, WebP (Maks. 5 MB/foto • Tersisa {{ remainingSlots }} dari {{ props.maxFiles }} slot)
      </p>
    </div>

    <!-- Galeri Preview Gambar Terupload -->
    <div
      v-if="props.modelValue.length > 0"
      class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
    >
      <div
        v-for="(imgSrc, idx) in props.modelValue"
        :key="idx"
        :class="[
          'group relative overflow-hidden rounded-2xl border bg-white p-2 shadow-xs transition',
          idx === 0 ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200',
        ]"
      >
        <div class="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
          <img
            :src="imgSrc"
            :alt="`Foto produk ${idx + 1}`"
            class="h-full w-full object-cover"
          />

          <!-- Badge Foto Utama -->
          <span
            v-if="idx === 0"
            class="absolute left-2 top-2 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs"
          >
            <Star class="h-2.5 w-2.5 fill-amber-300 text-amber-300" />
            <span>Foto Utama</span>
          </span>
          <span
            v-else
            class="absolute left-2 top-2 rounded-lg bg-slate-900/70 px-2 py-0.5 text-[10px] font-bold text-white"
          >
            #{{ idx + 1 }}
          </span>
        </div>

        <!-- Tombol Aksi per Foto -->
        <div class="mt-2 flex items-center justify-between gap-1.5">
          <button
            v-if="idx !== 0"
            type="button"
            @click="setAsPrimary(idx)"
            class="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            Jadikan Utama
          </button>
          <span
            v-else
            class="flex-1 px-1 text-[11px] font-semibold text-indigo-600"
          >
            Sampul Katalog
          </span>

          <button
            type="button"
            @click="removeImageAt(idx)"
            aria-label="Hapus foto"
            class="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-100"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <!-- Kartu Shortcut Tambah Foto Lagi -->
      <button
        v-if="remainingSlots > 0"
        type="button"
        @click="triggerFilePicker"
        class="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600"
      >
        <Plus class="h-6 w-6" />
        <span class="mt-1.5 text-xs font-bold">Tambah Foto</span>
        <span class="text-[10px] text-slate-400">({{ remainingSlots }} tersisa)</span>
      </button>
    </div>

    <!-- Pesan Error Validasi -->
    <p
      v-if="errorMessage"
      class="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600"
    >
      <AlertCircle class="h-4 w-4 shrink-0" />
      <span>{{ errorMessage }}</span>
    </p>
  </div>
</template>