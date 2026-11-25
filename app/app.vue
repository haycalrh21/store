<script setup lang="ts">
import { CheckCircle2 } from 'lucide-vue-next'

const { toastMessage } = useStore()
</script>

<template>
  <div class="flex min-h-screen flex-col bg-white text-slate-900 antialiased">
    <Navbar />

    <main class="flex-1">
      <NuxtPage />
    </main>

    <FooterSection />

    <!-- Slide-Over Keranjang -->
    <CartDrawer />

    <!-- Toast Notifikasi Global -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="toastMessage"
        class="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl"
      >
        <CheckCircle2 class="h-5 w-5 text-emerald-400" />
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>
  </div>
</template>