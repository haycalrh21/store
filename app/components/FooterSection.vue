<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'

const email = ref('')
const subscribed = ref(false)

const handleSubscribe = () => {
  if (!email.value) return
  subscribed.value = true
  email.value = ''
}
</script>

<template>
  <footer id="footer" class="border-t border-slate-200 bg-slate-950 text-slate-300">
    <div class="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
        <!-- Brand -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 text-xl font-bold text-white">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Sparkles class="h-4 w-4" />
            </span>
            <span>NEXASTORE</span>
          </div>
          <p class="text-sm leading-relaxed text-slate-400">
            Destinasi belanja gadget & aksesoris modern dengan kualitas terjamin dan pengiriman cepat ke seluruh Indonesia.
          </p>
        </div>

        <!-- Navigasi -->
        <div>
          <h4 class="text-sm font-semibold uppercase tracking-wider text-white">Menu</h4>
          <ul class="mt-4 space-y-2.5 text-sm text-slate-400">
            <li><a href="#hero" class="hover:text-white transition">Beranda</a></li>
            <li><a href="#products" class="hover:text-white transition">Katalog Produk</a></li>
            <li><a href="#features" class="hover:text-white transition">Promo Spesial</a></li>
          </ul>
        </div>

        <!-- Bantuan -->
        <div>
          <h4 class="text-sm font-semibold uppercase tracking-wider text-white">Bantuan</h4>
          <ul class="mt-4 space-y-2.5 text-sm text-slate-400">
            <li><a href="#" class="hover:text-white transition">Cara Pemesanan</a></li>
            <li><a href="#" class="hover:text-white transition">Cek Status Pengiriman</a></li>
            <li><a href="#" class="hover:text-white transition">Garansi & Pengembalian</a></li>
          </ul>
        </div>

        <!-- Newsletter -->
        <div>
          <h4 class="text-sm font-semibold uppercase tracking-wider text-white">Info Diskon</h4>
          <p class="mt-4 text-sm text-slate-400">
            Daftar untuk mendapatkan voucher diskon 10% pada pembelian pertama.
          </p>
          <form @submit.prevent="handleSubscribe" class="mt-4 flex gap-2">
            <input
              v-model="email"
              type="email"
              required
              placeholder="Email kamu..."
              class="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              class="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Kirim
            </button>
          </form>
          <p v-if="subscribed" class="mt-2 text-xs text-emerald-400">
            Terima kasih! Kode promo telah dikirim ke emailmu.
          </p>
        </div>
      </div>

      <div class="mt-12 border-t border-slate-800 pt-8 text-center text-xs text-slate-500">
        &copy; {{ new Date().getFullYear() }} NEXASTORE Indonesia. Hak Cipta Dilindungi.
      </div>
    </div>
  </footer>
</template>