<script setup lang="ts">
import {
  LayoutDashboard,
  ShoppingBag,
  Star,
  User,
  LogOut,
} from 'lucide-vue-next'

interface DbOrderItem {
  id: number
  orderId: number
  productId: number | null
  productName: string
  productImage: string
  price: number
  quantity: number
  rated?: boolean
}

interface DbOrder {
  id: number
  orderNumber: string
  userId: string | null
  customerEmail: string
  status: 'pending' | 'paid' | 'packed' | 'shipped' | 'shipping' | 'delivered' | 'failed'
  items: DbOrderItem[]
}

const route = useRoute()
const { user: sessionUser } = useUserSession()

// Ambil pesanan user & ulasan dari database
const { data: ordersData } = await useFetch<DbOrder[]>('/api/orders', {
  default: () => [],
})

const { data: reviewsData } = await useFetch<any[]>('/api/reviews', {
  default: () => [],
})

const user = computed(() => (sessionUser.value as any) ?? null)

const orders = computed(() => {
  const list = Array.isArray(ordersData.value) ? ordersData.value : []
  const uid = user.value?.id
  const email = user.value?.email?.toLowerCase()

  if (!uid && !email) return list

  return list.filter(
    (o) =>
      (uid && o.userId === uid) ||
      (email && o.customerEmail?.toLowerCase() === email)
  )
})

const reviews = computed(() => (Array.isArray(reviewsData.value) ? reviewsData.value : []))

const unratedCount = computed(() => {
  const reviewedProductIds = new Set(reviews.value.map((r) => r.productId))
  let count = 0

  for (const order of orders.value) {
    if (order.status === 'delivered') {
      for (const item of order.items ?? []) {
        const isRated = item.rated || (item.productId != null && reviewedProductIds.has(item.productId))
        if (!isRated) count++
      }
    }
  }
  return count
})

const menuItems = computed(() => [
  {
    label: 'Ringkasan',
    to: '/dashboard',
    icon: LayoutDashboard,
    badge: 0,
  },
  {
    label: 'Pesanan Saya',
    to: '/dashboard/pesanan',
    icon: ShoppingBag,
    badge: 0,
  },
  {
    label: 'Rating & Ulasan',
    to: '/dashboard/rating',
    icon: Star,
    badge: unratedCount.value,
  },
  {
    label: 'Data Diri',
    to: '/dashboard/datadiri',
    icon: User,
    badge: 0,
  },
])
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <!-- Header Profil -->
   

    <!-- Layout Utama: Sidebar Kiri + Konten Kanan -->
    <div class="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <div class="flex flex-col items-start gap-8 lg:flex-row">
        <!-- Sidebar Navigasi -->
        <aside class="w-full shrink-0 lg:w-64">
          <nav class="flex flex-col space-y-1 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xs">
            <NuxtLink
              v-for="item in menuItems"
              :key="item.to"
              :to="item.to"
              :class="[
                'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition',
                (item.to === '/dashboard' ? route.path === '/dashboard' : route.path.startsWith(item.to))
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              ]"
            >
              <span class="flex items-center gap-3">
                <component :is="item.icon" class="h-4 w-4 shrink-0" />
                <span>{{ item.label }}</span>
              </span>
              <span
                v-if="item.badge > 0"
                :class="[
                  'rounded-full px-2 py-0.5 text-xs font-bold',
                  (item.to === '/dashboard' ? route.path === '/dashboard' : route.path.startsWith(item.to))
                    ? 'bg-white text-indigo-600'
                    : 'bg-amber-100 text-amber-700',
                ]"
              >
                {{ item.badge }}
              </span>
            </NuxtLink>

            <div class="my-1 border-t border-slate-100" />

            <!-- <button
              @click="handleLogout"
              class="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <LogOut class="h-4 w-4 shrink-0" />
              <span>Keluar Akun</span>
            </button> -->
          </nav>
        </aside>

        <!-- Konten Sub-Halaman -->
        <div class="w-full min-w-0 flex-1">
          <NuxtPage />
        </div>
      </div>
    </div>
  </div>
</template>