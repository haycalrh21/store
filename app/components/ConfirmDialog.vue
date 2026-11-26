<script setup lang="ts">
import { AlertTriangle, HelpCircle, X } from 'lucide-vue-next'

const { confirmState, handleConfirm, handleCancel } = useConfirm()

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && confirmState.value.isOpen) {
    handleCancel()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const variantStyles = computed(() => {
  switch (confirmState.value.variant) {
    case 'primary':
      return {
        iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
        btnBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        icon: HelpCircle,
      }
    case 'warning':
      return {
        iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
        btnBg: 'bg-amber-500 hover:bg-amber-600 text-white',
        icon: AlertTriangle,
      }
    default:
      return {
        iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
        btnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
        icon: AlertTriangle,
      }
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="confirmState.isOpen"
        @click.self="handleCancel"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      >
        <div
          role="dialog"
          aria-modal="true"
          class="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          <button
            type="button"
            @click="handleCancel"
            aria-label="Tutup dialog"
            class="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X class="h-4 w-4" />
          </button>

          <div
            :class="[
              'mx-auto flex h-12 w-12 items-center justify-center rounded-2xl',
              variantStyles.iconBg,
            ]"
          >
            <component :is="variantStyles.icon" class="h-6 w-6" />
          </div>

          <h3 class="mt-4 text-base font-extrabold text-slate-900 dark:text-white">
            {{ confirmState.title }}
          </h3>

          <p
            v-if="confirmState.description"
            class="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400"
          >
            {{ confirmState.description }}
          </p>

          <div class="mt-6 flex gap-3">
            <button
              type="button"
              @click="handleCancel"
              class="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {{ confirmState.cancelText }}
            </button>

            <button
              type="button"
              @click="handleConfirm"
              :class="[
                'flex-1 rounded-xl py-2.5 text-xs font-bold shadow-xs transition',
                variantStyles.btnBg,
              ]"
            >
              {{ confirmState.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>