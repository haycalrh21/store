<script setup lang="ts">
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-vue-next'

const { cart, isCartOpen, cartTotal, updateQuantity, removeFromCart, formatRupiah } = useStore()

const handleCheckout = async () => {
  isCartOpen.value = false
  await navigateTo('/checkout')
}
</script>

<template>
  <!-- Backdrop -->
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isCartOpen"
      @click="isCartOpen = false"
      class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs"
    />
  </Transition>

  <!-- Drawer Panel -->
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    enter-from-class="translate-x-full"
    enter-to-class="translate-x-0"
    leave-active-class="transition-transform duration-200 ease-in"
    leave-from-class="translate-x-0"
    leave-to-class="translate-x-full"
  >
    <aside
      v-if="isCartOpen"
      class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div class="flex items-center gap-2.5">
          <ShoppingBag class="h-5 w-5 text-indigo-600" />
          <h2 class="text-lg font-bold text-slate-900">Keranjang Belanja</h2>
        </div>
        <button
          @click="isCartOpen = false"
          aria-label="Tutup keranjang"
          class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Isi Keranjang -->
      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="cart.length === 0" class="flex h-full flex-col items-center justify-center text-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <ShoppingBag class="h-8 w-8" />
          </div>
          <p class="mt-4 text-base font-semibold text-slate-900">Keranjang masih kosong</p>
          <p class="mt-1 text-sm text-slate-500">Yuk pilih produk favoritmu terlebih dahulu.</p>
          <button
            @click="isCartOpen = false"
            class="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Mulai Belanja
          </button>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="item in cart"
            :key="item.product.id"
            class="flex gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5"
          >
            <img
              :src="item.product.image"
              :alt="item.product.name"
              class="h-20 w-20 rounded-xl object-cover bg-white"
            />
            <div class="flex flex-1 flex-col justify-between">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <NuxtLink
                    :to="`/products/${item.product.id}`"
                    @click="isCartOpen = false"
                    class="text-sm font-bold text-slate-900 hover:text-indigo-600"
                  >
                    {{ item.product.name }}
                  </NuxtLink>
                  <p class="mt-0.5 text-xs font-semibold text-indigo-600">
                    {{ formatRupiah(item.product.price) }}
                  </p>
                </div>
                <button
                  @click="removeFromCart(item.product.id)"
                  aria-label="Hapus produk"
                  class="text-slate-400 hover:text-rose-600"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>

              <!-- Kontrol Jumlah -->
              <div class="mt-2 flex items-center gap-2">
                <button
                  @click="updateQuantity(item.product.id, -1)"
                  class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                >
                  <Minus class="h-3.5 w-3.5" />
                </button>
                <span class="w-6 text-center text-xs font-bold text-slate-900">
                  {{ item.quantity }}
                </span>
                <button
                  @click="updateQuantity(item.product.id, 1)"
                  class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                >
                  <Plus class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Checkout -->
      <div v-if="cart.length > 0" class="border-t border-slate-200 bg-slate-50 p-6">
        <div class="flex items-center justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span class="text-lg font-extrabold text-slate-900">{{ formatRupiah(cartTotal) }}</span>
        </div>
        <button
          @click="handleCheckout"
          class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
        >
          <span>Checkout Sekarang</span>
          <ArrowRight class="h-4 w-4" />
        </button>
      </div>
    </aside>
  </Transition>
</template>