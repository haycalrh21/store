<script setup lang="ts">
import {
  Search,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  Users,
  Loader2,
} from 'lucide-vue-next'

interface ManagedUser {
  id: string
  name: string
  email: string
  city: string
  role: 'Admin' | 'Member'
  rawRole: string
  status: 'Aktif' | 'Nonaktif'
  banned: boolean
}

const { showToast } = useStore()
const { user: currentSessionUser } = useUserSession()

const {
  data: usersData,
  pending: isLoading,
  refresh,
} = await useFetch<ManagedUser[]>('/api/admin/users', {
  default: () => [],
})

const managedUsers = computed(() => (Array.isArray(usersData.value) ? usersData.value : []))
const processingUserId = ref<string | null>(null)

const searchUser = ref('')
const roleFilter = ref<'Semua' | 'Admin' | 'Member'>('Semua')

const filteredUsers = computed(() => {
  const q = searchUser.value.trim().toLowerCase()
  return managedUsers.value.filter((u) => {
    const matchRole = roleFilter.value === 'Semua' || u.role === roleFilter.value
    const matchQuery =
      !q ||
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.city || '').toLowerCase().includes(q)
    return matchRole && matchQuery
  })
})

const toggleUserRole = async (usr: ManagedUser) => {
  processingUserId.value = usr.id
  try {
    const nextRole = usr.role === 'Admin' ? 'user' : 'admin'
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: { userId: usr.id, action: 'toggle-role', role: nextRole },
    })
    await refresh()
    showToast(`Role ${usr.name} diubah menjadi ${nextRole === 'admin' ? 'Admin' : 'Member'}.`)
  } catch (err: any) {
    showToast(err?.data?.statusMessage || 'Gagal mengubah role pengguna.')
  } finally {
    processingUserId.value = null
  }
}

const toggleUserStatus = async (usr: ManagedUser) => {
  processingUserId.value = usr.id
  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: { userId: usr.id, action: 'toggle-status' },
    })
    await refresh()
    showToast(`Status akun ${usr.name} berhasil diperbarui.`)
  } catch (err: any) {
    showToast(err?.data?.statusMessage || 'Gagal memperbarui status pengguna.')
  } finally {
    processingUserId.value = null
  }
}

const deleteManagedUser = async (usr: ManagedUser) => {
  if (!confirm(`Yakin ingin menghapus akun ${usr.name} (${usr.email})?`)) return
  processingUserId.value = usr.id
  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: { userId: usr.id, action: 'delete' },
    })
    await refresh()
    showToast(`Akun ${usr.name} berhasil dihapus.`)
  } catch (err: any) {
    showToast(err?.data?.statusMessage || 'Gagal menghapus pengguna.')
  } finally {
    processingUserId.value = null
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <h1 class="text-xl font-extrabold text-slate-900">Kelola Pengguna</h1>
      <p class="mt-0.5 text-xs text-slate-500 sm:text-sm">
        Atur hak akses role, status keaktifan akun, dan pantau aktivitas pelanggan.
      </p>
    </div>

    <!-- Filter & Pencarian -->
    <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
      <div class="relative flex-1 sm:max-w-xs">
        <Search class="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          v-model="searchUser"
          type="text"
          placeholder="Cari nama, email, atau kota..."
          class="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-4 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none sm:text-sm"
        />
      </div>

      <div class="flex items-center gap-1.5">
        <button
          v-for="role in (['Semua', 'Admin', 'Member'] as const)"
          :key="role"
          @click="roleFilter = role"
          :class="[
            'rounded-xl px-3.5 py-1.5 text-xs font-bold transition',
            roleFilter === role
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          ]"
        >
          {{ role }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="isLoading && managedUsers.length === 0"
      class="rounded-2xl border border-slate-200 bg-white p-14 text-center text-sm font-semibold text-slate-500"
    >
      Memuat daftar pengguna...
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredUsers.length === 0"
      class="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center"
    >
      <Users class="mx-auto h-10 w-10 text-slate-400" />
      <h3 class="mt-3 text-base font-bold text-slate-900">Pengguna tidak ditemukan</h3>
    </div>

    <!-- Tabel Desktop & Kartu Mobile -->
    <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <!-- Tabel Desktop -->
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th class="px-5 py-3.5">Pengguna</th>
              <th class="px-4 py-3.5">Kota</th>
              <th class="px-4 py-3.5">Role</th>
              <th class="px-4 py-3.5">Status</th>
              <th class="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="usr in filteredUsers"
              :key="usr.id"
              class="transition hover:bg-slate-50/70"
            >
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-extrabold text-indigo-700">
                    {{ (usr.name || usr.email || 'U').charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="font-bold text-slate-900">{{ usr.name }}</p>
                      <span
                        v-if="(currentSessionUser as any)?.id === usr.id"
                        class="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600"
                      >
                        Anda
                      </span>
                    </div>
                    <p class="text-xs text-slate-500">{{ usr.email }}</p>
                  </div>
                </div>
              </td>

              <td class="px-4 py-4 text-xs font-medium text-slate-600">
                {{ usr.city || '-' }}
              </td>

              <td class="px-4 py-4">
                <span
                  :class="[
                    'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold',
                    usr.role === 'Admin'
                      ? 'bg-purple-50 text-purple-700'
                      : 'bg-slate-100 text-slate-700',
                  ]"
                >
                  <Shield class="h-3 w-3" />
                  <span>{{ usr.role }}</span>
                </span>
              </td>

              <td class="px-4 py-4">
                <span
                  :class="[
                    'rounded-full px-2.5 py-1 text-xs font-bold',
                    usr.status === 'Aktif'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-600',
                  ]"
                >
                  {{ usr.status }}
                </span>
              </td>

              <td class="px-5 py-4 text-right">
                <div class="inline-flex items-center gap-2">
                  <button
                    :disabled="processingUserId === usr.id"
                    @click="toggleUserRole(usr)"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Loader2 v-if="processingUserId === usr.id" class="h-3.5 w-3.5 animate-spin" />
                    <span>Jadikan {{ usr.role === 'Admin' ? 'Member' : 'Admin' }}</span>
                  </button>
                  <button
                    :disabled="processingUserId === usr.id || (currentSessionUser as any)?.id === usr.id"
                    @click="toggleUserStatus(usr)"
                    :class="[
                      'inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-40',
                      usr.status === 'Aktif'
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                    ]"
                  >
                    <UserX v-if="usr.status === 'Aktif'" class="h-3.5 w-3.5" />
                    <UserCheck v-else class="h-3.5 w-3.5" />
                    <span>{{ usr.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan' }}</span>
                  </button>
                  <button
                    :disabled="processingUserId === usr.id || (currentSessionUser as any)?.id === usr.id"
                    @click="deleteManagedUser(usr)"
                    aria-label="Hapus user"
                    class="rounded-xl border border-rose-200 bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-100 disabled:opacity-40"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Kartu Mobile -->
      <div class="divide-y divide-slate-100 md:hidden">
        <div
          v-for="usr in filteredUsers"
          :key="usr.id"
          class="space-y-3 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-extrabold text-indigo-700">
                {{ (usr.name || usr.email || 'U').charAt(0).toUpperCase() }}
              </div>
              <div>
                <p class="text-sm font-bold text-slate-900">{{ usr.name }}</p>
                <p class="text-xs text-slate-500">{{ usr.email }}</p>
                <p class="mt-0.5 text-[11px] text-slate-400">{{ usr.city || '-' }} • {{ usr.role }}</p>
              </div>
            </div>

            <span
              :class="[
                'rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                usr.status === 'Aktif'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-600',
              ]"
            >
              {{ usr.status }}
            </span>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              :disabled="processingUserId === usr.id"
              @click="toggleUserRole(usr)"
              class="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Jadikan {{ usr.role === 'Admin' ? 'Member' : 'Admin' }}
            </button>
            <button
              :disabled="processingUserId === usr.id || (currentSessionUser as any)?.id === usr.id"
              @click="toggleUserStatus(usr)"
              class="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
            >
              {{ usr.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan' }}
            </button>
            <button
              :disabled="processingUserId === usr.id || (currentSessionUser as any)?.id === usr.id"
              @click="deleteManagedUser(usr)"
              aria-label="Hapus user"
              class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-600 hover:bg-rose-100 disabled:opacity-40"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>