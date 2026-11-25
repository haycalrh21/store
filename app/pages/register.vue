<script setup lang="ts">
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-vue-next'

// Hanya bisa diakses kalau belum login
definePageMeta({ auth: 'guest' })

const signUpEmail = useSignUp('email')

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const errorMessage = ref('')

const isLoading = computed(() => signUpEmail.status.value === 'pending')

const handleRegister = async () => {
  errorMessage.value = ''

  if (password.value.length < 6) {
    errorMessage.value = 'Password minimal 6 karakter.'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Konfirmasi password tidak cocok.'
    return
  }

  await signUpEmail.execute(
    { name: name.value, email: email.value, password: password.value },
    { onSuccess: () => navigateTo('/login') },
  )

  // execute() tidak pernah throw, jadi cek status-nya
  if (signUpEmail.status.value === 'error') {
    errorMessage.value = signUpEmail.error.value?.message || 'Pendaftaran gagal. Coba lagi.'
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
        <h1 class="mt-4 text-2xl font-extrabold text-slate-900">Buat Akun Baru</h1>
        <p class="mt-1.5 text-sm text-slate-500">
          Daftar gratis dan nikmati voucher diskon pengguna baru.
        </p>
      </div>

      <form @submit.prevent="handleRegister" class="mt-8 space-y-4">
        <div v-if="errorMessage" class="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-600">
          {{ errorMessage }}
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-700">Nama Lengkap</label>
          <div class="relative mt-1.5">
            <User class="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
            <input
              v-model="name"
              type="text"
              required
              autocomplete="name"
              placeholder="Contoh: Haycal Rayhansyah"
              class="w-full rounded-xl border border-slate-300 py-2.5 pl-11 pr-4 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>
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
          <label class="block text-sm font-semibold text-slate-700">Password</label>
          <div class="relative mt-1.5">
            <Lock class="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="new-password"
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

        <div>
          <label class="block text-sm font-semibold text-slate-700">Konfirmasi Password</label>
          <div class="relative mt-1.5">
            <Lock class="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
            <input
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="new-password"
              placeholder="Ulangi password"
              class="w-full rounded-xl border border-slate-300 py-2.5 pl-11 pr-4 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{{ isLoading ? 'Memproses...' : 'Daftar Sekarang' }}</span>
          <ArrowRight v-if="!isLoading" class="h-4 w-4" />
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-600">
        Sudah punya akun?
        <NuxtLink to="/login" class="font-bold text-indigo-600 hover:underline">
          Masuk di sini
        </NuxtLink>
      </p>
    </div>
  </div>
</template>