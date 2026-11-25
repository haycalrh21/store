<script setup lang="ts">
import { User, Mail, Phone, MapPin, Save, Loader2 } from 'lucide-vue-next'

interface UserProfileResponse {
  userId?: string
  name: string
  email: string
  phone: string
  city: string
  address: string
}

const { showToast } = useStore()
const userSession = useUserSession()
const sessionUser = userSession.user

// Ambil data diri dari PostgreSQL
const { data: profileData, refresh } = await useFetch<UserProfileResponse>('/api/user/profile', {
  default: () => ({
    name: (sessionUser.value as any)?.name || '',
    email: (sessionUser.value as any)?.email || '',
    phone: '',
    city: '',
    address: '',
  }),
})

const isSaving = ref(false)

const profileForm = ref({
  name: '',
  email: '',
  phone: '',
  city: '',
  address: '',
})

watch(
  profileData,
  (val) => {
    if (!val) return
    profileForm.value = {
      name: val.name || (sessionUser.value as any)?.name || '',
      email: val.email || (sessionUser.value as any)?.email || '',
      phone: val.phone || '',
      city: val.city || '',
      address: val.address || '',
    }
  },
  { immediate: true }
)

const handleSaveProfile = async () => {
  isSaving.value = true
  try {
    const saved = await $fetch<UserProfileResponse>('/api/user/profile', {
      method: 'POST',
      body: { ...profileForm.value },
    })

    // 1. Update reaktif state sessionUser secara langsung agar Navbar berubah seketika
    if (sessionUser.value) {
      sessionUser.value = {
        ...sessionUser.value,
        name: saved?.name || profileForm.value.name,
        email: saved?.email || profileForm.value.email,
      }
    }

    // 2. Refresh ulang data profil & paksa Better-Auth memuat ulang sesi terbaru dari DB
    await refresh()
    const refreshFn = (userSession as any).fetchSession || (userSession as any).fetch
    if (typeof refreshFn === 'function') {
      await refreshFn({ force: true }).catch(() => refreshFn())
    }

    showToast('Data diri & alamat berhasil disimpan!')
  } catch (err: any) {
    showToast(err?.data?.statusMessage || 'Gagal menyimpan data diri.')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
    <h2 class="text-base font-extrabold text-slate-900">Data Diri & Alamat Pengiriman</h2>
    <p class="mt-1 text-sm text-slate-500">
      Informasi ini digunakan untuk pengiriman paket dan konfirmasi pesanan.
    </p>

    <form @submit.prevent="handleSaveProfile" class="mt-6 space-y-5">
      <div class="grid gap-5 sm:grid-cols-2">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Nama Lengkap</label>
          <div class="relative mt-1.5">
            <User class="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              v-model="profileForm.name"
              type="text"
              required
              class="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Email</label>
          <div class="relative mt-1.5">
            <Mail class="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              v-model="profileForm.email"
              type="email"
              required
              class="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">No. Handphone / WhatsApp</label>
          <div class="relative mt-1.5">
            <Phone class="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              v-model="profileForm.phone"
              type="text"
              placeholder="08xx-xxxx-xxxx"
              class="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Kota & Kode Pos</label>
          <div class="relative mt-1.5">
            <MapPin class="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              v-model="profileForm.city"
              type="text"
              placeholder="Contoh: Jakarta Timur, 13220"
              class="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Alamat Lengkap</label>
        <textarea
          v-model="profileForm.address"
          rows="3"
          placeholder="Nama jalan, nomor rumah, kelurahan, kecamatan..."
          class="mt-1.5 w-full rounded-xl border border-slate-300 p-3.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
        />
      </div>

      <div class="flex justify-end pt-2">
        <button
          type="submit"
          :disabled="isSaving"
          class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
        >
          <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          <span>{{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>