<script setup lang="ts">
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Store,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-vue-next'

const route = useRoute()
const mobileMenuOpen = ref(false)

const { data: productsData } = await useFetch<any[]>('/api/admin/products', { default: () => [] })
const { data: ordersData } = await useFetch<any[]>('/api/orders', { default: () => [] })
const { data: usersData } = await useFetch<any[]>('/api/admin/users', { default: () => [] })

const navItems = computed(() => [
  {
    label: 'Ringkasan',
    to: '/admin',
    icon: LayoutDashboard,
    count: null,
  },
  {
    label: 'Produk',
    to: '/admin/produk',
    icon: Package,
    count: productsData.value?.length ?? 0,
  },
  {
    label: 'Pesanan',
    to: '/admin/pesanan',
    icon: ShoppingBag,
    count: ordersData.value?.length ?? 0,
  },
  {
    label: 'User',
    to: '/admin/user',
    icon: Users,
    count: usersData.value?.length ?? 0,
  },
])

const isActiveRoute = (to: string) => {
  if (to === '/admin') return route.path === '/admin'
  return route.path.startsWith(to)
}

watch(
  () => route.path,
  () => {
    mobileMenuOpen.value = false
  }
)
</script>

<template>
  <div class="min-h-screen bg-slate-100/80">
    <!-- Top Bar Khusus Mobile & Tablet -->
    <div class="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
      <div class="flex items-center gap-2.5">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
          <ShieldCheck class="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <span class="block text-sm font-extrabold text-slate-900">Admin Panel</span>
          <span class="block text-[11px] text-slate-500">NEXASTORE Management</span>
        </div>
      </div>

      <button
        @click="mobileMenuOpen = !mobileMenuOpen"
        aria-label="Buka menu admin"
        class="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
      >
        <X v-if="mobileMenuOpen" class="h-5 w-5" />
        <Menu v-else class="h-5 w-5" />
      </button>
    </div>

    <!-- Drawer Navigasi Mobile -->
    <div
      v-if="mobileMenuOpen"
      @click.self="mobileMenuOpen = false"
      class="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
    >
      <div class="h-full w-72 bg-white p-5 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-2.5">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
              <ShieldCheck class="h-5 w-5 text-indigo-400" />
            </div>
            <span class="text-base font-extrabold text-slate-900">Admin Panel</span>
          </div>
          <button
            @click="mobileMenuOpen = false"
            class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <nav class="mt-4 flex flex-col space-y-1.5">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            :class="[
              'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition',
              isActiveRoute(item.to)
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            ]"
          >
            <span class="flex items-center gap-3">
              <component :is="item.icon" class="h-4 w-4 shrink-0" />
              <span>{{ item.label }}</span>
            </span>
            <span
              v-if="item.count !== null"
              :class="[
                'rounded-full px-2 py-0.5 text-xs font-bold',
                isActiveRoute(item.to)
                  ? 'bg-white text-indigo-600'
                  : 'bg-slate-100 text-slate-600',
              ]"
            >
              {{ item.count }}
            </span>
          </NuxtLink>
        </nav>

        <div class="mt-6 border-t border-slate-100 pt-4">
          <NuxtLink
            to="/"
            class="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Store class="h-4 w-4 text-indigo-600" />
            <span>Lihat Toko Utama</span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Container Utama Desktop & Mobile -->
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div class="flex flex-col items-start gap-8 lg:flex-row">
        <!-- Sidebar Desktop -->
        <aside class="hidden w-64 shrink-0 lg:block">
          <div class="sticky top-24 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
            <div class="mb-3 flex items-center gap-3 border-b border-slate-100 px-2 pb-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                <ShieldCheck class="h-5 w-5 text-indigo-400" />
              </div>
              <div class="min-w-0">
                <span class="block truncate text-sm font-extrabold text-slate-900">Admin Panel</span>
                <span class="block truncate text-xs text-slate-500">NEXASTORE Control</span>
              </div>
            </div>

            <nav class="flex flex-col space-y-1">
              <NuxtLink
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                :class="[
                  'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition',
                  isActiveRoute(item.to)
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                ]"
              >
                <span class="flex items-center gap-3">
                  <component :is="item.icon" class="h-4 w-4 shrink-0" />
                  <span class="whitespace-nowrap">{{ item.label }}</span>
                </span>
                <span
                  v-if="item.count !== null"
                  :class="[
                    'rounded-full px-2 py-0.5 text-xs font-bold',
                    isActiveRoute(item.to)
                      ? 'bg-white text-indigo-600'
                      : 'bg-slate-100 text-slate-600',
                  ]"
                >
                  {{ item.count }}
                </span>
              </NuxtLink>
            </nav>

            <div class="mt-4 border-t border-slate-100 pt-3">
              <NuxtLink
                to="/"
                class="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
              >
                <Store class="h-4 w-4 text-indigo-600" />
                <span>Kembali ke Toko</span>
              </NuxtLink>
            </div>
          </div>
        </aside>

        <!-- Area Konten Dinamis -->
        <main class="w-full min-w-0 flex-1">
          <NuxtPage />
        </main>
      </div>
    </div>
  </div>
</template>