<script setup lang="ts">
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-vue-next'

// Hanya bisa diakses kalau belum login (sudah login -> diarahkan keluar)
definePageMeta({ auth: 'guest' })

const signInEmail = useSignIn('email')

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMessage = ref('')

const isLoading = computed(() => signInEmail.status.value === 'pending')

const handleLogin = async () => {
  errorMessage.value = ''
  if (!email.value || password.value.length < 6) {
    errorMessage.value = 'Masukkan email valid dan password minimal 6 karakter.'
    return
  }

  await signInEmail.execute(
    { email: email.value, password: password.value },
    { onSuccess: () => navigateTo('/') },
  )

  // execute() tidak pernah throw, jadi cek status-nya
  if (signInEmail.status.value === 'error') {
    errorMessage.value = signInEmail.error.value?.message || 'Email atau password salah.'
  }
}
</script>

<template>
  <div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-4 py-12">
    <div class="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50">
      <div class="text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
          <Sparkles class="h-6 w-6" />
        </div>
        <h1 class="mt-4 text-2xl font-extrabold text-slate-900">Masuk ke NEXASTORE</h1>
        <p class="mt-1.5 text-sm text-slate-500">
          Kelola pesanan dan simpan produk favoritmu.
        </p>
      </div>

      <form @submit.prevent="handleLogin" class="mt-8 space-y-5">
        <div v-if="errorMessage" class="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-600">
          {{ errorMessage }}
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-700">Email</label>
          <div class="relative mt-1.5">
            <Mail class="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="nama@email.com"
              class="w-full rounded-xl border border-slate-300 py-2.5 pl-11 pr-4 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <label class="block text-sm font-semibold text-slate-700">Password</label>
            <a href="#" class="text-xs font-semibold text-indigo-600 hover:underline">Lupa password?</a>
          </div>
          <div class="relative mt-1.5">
            <Lock class="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="current-password"
              placeholder="Minimal 6 karakter"
              class="w-full rounded-xl border border-slate-300 py-2.5 pl-11 pr-11 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
            >
              <EyeOff v-if="showPassword" class="h-5 w-5" />
              <Eye v-else class="h-5 w-5" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{{ isLoading ? 'Memproses...' : 'Masuk' }}</span>
          <ArrowRight v-if="!isLoading" class="h-4 w-4" />
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-600">
        Belum punya akun?
        <NuxtLink to="/register" class="font-bold text-indigo-600 hover:underline">
          Daftar sekarang
        </NuxtLink>
      </p>
    </div>
  </div>
</template>