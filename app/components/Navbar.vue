<script setup lang="ts">
import {
  ShoppingBag,
  Menu,
  X,
  Sparkles,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-vue-next'

const route = useRoute()
const { cartCount, isCartOpen } = useStore()
const { user, loggedIn, signOut } = useUserSession()
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

const toggleDarkMode = () => {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

const isMobileMenuOpen = ref(false)
const isUserDropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const isAdmin = computed(
  () => String((user.value as { role?: string } | null)?.role || '').toLowerCase() === 'admin'
)

const displayName = computed(() => {
  if (!user.value) return ''
  return user.value.name || user.value.email?.split('@')[0] || 'Pengguna'
})

const navLinks = [
  { name: 'Beranda', to: '/' },
  { name: 'Katalog Produk', to: '/products' },
  { name: 'Kontak', to: '/#footer' },
]

const handleLogout = async () => {
  await signOut()
  isUserDropdownOpen.value = false
  isMobileMenuOpen.value = false
  await navigateTo('/login')
}

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isUserDropdownOpen.value = false
  }
}

watch(
  () => route.path,
  () => {
    isUserDropdownOpen.value = false
    isMobileMenuOpen.value = false
  }
)

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-950/85">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <Sparkles class="h-5 w-5" />
        </span>
        <span>NEXA<span class="text-indigo-600 dark:text-indigo-400">STORE</span></span>
      </NuxtLink>

      <!-- Menu Laptop -->
      <nav class="hidden items-center gap-8 md:flex">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.name"
          :to="link.to"
          class="text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
        >
          {{ link.name }}
        </NuxtLink>
      </nav>

      <!-- Action Kanan -->
      <div class="flex items-center gap-2.5">
        <!-- Tombol Toggle Dark / Light Mode -->
        <ClientOnly>
          <button
            type="button"
            @click="toggleDarkMode"
            :aria-label="isDark ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'"
            :title="isDark ? 'Mode Terang' : 'Mode Gelap'"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
          >
            <Sun v-if="isDark" class="h-4 w-4 text-amber-400" />
            <Moon v-else class="h-4 w-4" />
          </button>
        </ClientOnly>

        <!-- Tombol Keranjang -->
        <button
          @click="isCartOpen = true"
          aria-label="Keranjang Belanja"
          class="relative flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
        >
          <ShoppingBag class="h-4 w-4" />
          <span class="hidden sm:inline">Keranjang</span>
          <span
            v-if="cartCount > 0"
            class="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white"
          >
            {{ cartCount }}
          </span>
        </button>

        <!-- Belum Login: Masuk & Daftar -->
        <template v-if="!loggedIn || !user">
          <NuxtLink
            to="/login"
            class="hidden rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 md:inline-flex dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Masuk
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="hidden rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 md:inline-flex"
          >
            Daftar
          </NuxtLink>
        </template>

        <!-- Sudah Login: Dropdown "Hi, $nama" -->
        <div v-else ref="dropdownRef" class="relative hidden md:block">
          <button
            type="button"
            @click="isUserDropdownOpen = !isUserDropdownOpen"
            class="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
          >
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-extrabold text-white">
              {{ displayName.charAt(0).toUpperCase() }}
            </span>
            <span>Hi, {{ displayName }}</span>
            <ChevronDown
              :class="[
                'h-3.5 w-3.5 transition-transform duration-150',
                isUserDropdownOpen ? 'rotate-180' : '',
              ]"
            />
          </button>

          <!-- Isi Dropdown -->
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 scale-95 -translate-y-1"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 -translate-y-1"
          >
            <div
              v-if="isUserDropdownOpen"
              class="absolute right-0 mt-2 w-56 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <!-- Info Singkat Akun -->
              <div class="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                <p class="truncate text-xs font-extrabold text-slate-900 dark:text-white">{{ displayName }}</p>
                <p class="truncate text-[11px] text-slate-500 dark:text-slate-400">{{ user.email }}</p>
              </div>

              <!-- Menu Navigasi Akun -->
              <div class="space-y-0.5 py-1">
                <!-- Khusus Admin: Tampilkan Admin Panel -->
                <NuxtLink
                  v-if="isAdmin"
                  to="/admin"
                  @click="isUserDropdownOpen = false"
                  class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                >
                  <ShieldCheck class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Admin Panel</span>
                </NuxtLink>

                <!-- Semua User (Admin & Member): Tampilkan Dashboard -->
                <NuxtLink
                  to="/dashboard"
                  @click="isUserDropdownOpen = false"
                  class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                >
                  <LayoutDashboard class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Dashboard</span>
                </NuxtLink>
              </div>

              <!-- Tombol Logout -->
              <div class="border-t border-slate-100 pt-1 dark:border-slate-800">
                <button
                  type="button"
                  @click="handleLogout"
                  class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                >
                  <LogOut class="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Hamburger Mobile -->
        <button
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          aria-label="Toggle Menu"
          class="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Menu v-if="!isMobileMenuOpen" class="h-6 w-6" />
          <X v-else class="h-6 w-6" />
        </button>
      </div>
    </div>

    <!-- Dropdown Mobile -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="isMobileMenuOpen" class="border-t border-slate-200 bg-white px-4 pb-5 pt-3 shadow-lg md:hidden dark:border-slate-800 dark:bg-slate-950">
        <nav class="flex flex-col space-y-2">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.name"
            :to="link.to"
            @click="isMobileMenuOpen = false"
            class="rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
          >
            {{ link.name }}
          </NuxtLink>

          <div class="my-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <!-- Mobile: Belum Login -->
            <template v-if="!loggedIn || !user">
              <div class="grid grid-cols-2 gap-2">
                <NuxtLink
                  to="/login"
                  @click="isMobileMenuOpen = false"
                  class="rounded-xl border border-slate-300 py-2.5 text-center text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Masuk
                </NuxtLink>
                <NuxtLink
                  to="/register"
                  @click="isMobileMenuOpen = false"
                  class="rounded-xl bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Daftar
                </NuxtLink>
              </div>
            </template>

            <!-- Mobile: Sudah Login -->
            <div v-else class="space-y-2">
              <div class="px-3 py-1">
                <p class="text-sm font-bold text-slate-900 dark:text-white">Hi, {{ displayName }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">{{ user.email }}</p>
              </div>

              <!-- Khusus Admin: Tampilkan Admin Panel -->
              <NuxtLink
                v-if="isAdmin"
                to="/admin"
                @click="isMobileMenuOpen = false"
                class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white"
              >
                <ShieldCheck class="h-4 w-4" />
                <span>Admin Panel</span>
              </NuxtLink>

              <!-- Semua User (Admin & Member): Tampilkan Dashboard -->
              <NuxtLink
                to="/dashboard"
                @click="isMobileMenuOpen = false"
                :class="[
                  'flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold',
                  isAdmin
                    ? 'border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'bg-indigo-600 text-white',
                ]"
              >
                <LayoutDashboard class="h-4 w-4" />
                <span>Dashboard</span>
              </NuxtLink>

              <button
                @click="handleLogout"
                class="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-2 text-sm font-semibold text-rose-600 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-400"
              >
                <LogOut class="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </nav>
      </div>
    </Transition>
  </header>
</template>