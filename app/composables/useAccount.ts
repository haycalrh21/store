import type { Product } from '~/composables/useStore'

export interface AccountProfile {
    name: string
    email: string
    phone?: string
    city?: string
    address?: string
}

export type OrderStatus = 'packed' | 'shipping' | 'delivered'

export interface OrderItem {
    product: Product
    quantity: number
    rated?: boolean
}

export interface Order {
    id: string
    date: string
    status: OrderStatus
    courier: string
    resi: string
    items: OrderItem[]
    total: number
    shippingAddress: string
}

export interface ProductReview {
    id: string
    orderId: string
    productId: number
    productName: string
    productImage: string
    rating: number
    comment: string
    date: string
}

export const useAccount = () => {
    const { cart, cartTotal, clearCart, showToast } = useStore()

    // Menggunakan key 'user' yang sama agar sinkron dengan Navbar, Login, dan Register
    const user = useState<AccountProfile | null>('user', () => ({
        name: 'Haycal Rayhansyah',
        email: 'haycal@nexastore.id',
        phone: '0812-3456-7890',
        city: 'Jakarta Timur, 13220',
        address: 'Jl. Pemuda Raya No. 45, Rawamangun, Kec. Pulo Gadung, Kota Jakarta Timur',
    }))

    // Daftar Pesanan dengan 3 Status Pengiriman
    const orders = useState<Order[]>('account_orders', () => [
        {
            id: 'INV-20261125-9041',
            date: '25 Nov 2026, 06:45 WIB',
            status: 'packed',
            courier: 'J&T Express Regular',
            resi: 'JP8829104421',
            total: 1150000,
            shippingAddress: 'Jl. Pemuda Raya No. 45, Rawamangun, Jakarta Timur',
            items: [
                {
                    product: {
                        id: 3,
                        name: 'KeyCraft Mechanical 75%',
                        category: 'Workspace',
                        price: 1150000,
                        rating: 4.9,
                        reviewsCount: 210,
                        stock: 12,
                        image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=900&q=80',
                        description: 'Keyboard mekanikal layout 75% gasket-mount dengan switch linear pre-lubed.',
                        specs: ['Hot-swappable 5-pin PCB'],
                    },
                    quantity: 1,
                    rated: false,
                },
            ],
        },
        {
            id: 'INV-20261123-7720',
            date: '23 Nov 2026, 14:20 WIB',
            status: 'shipping',
            courier: 'JNE YES (Yakin Esok Sampai)',
            resi: 'JNE0098123499',
            total: 1850000,
            shippingAddress: 'Jl. Pemuda Raya No. 45, Rawamangun, Jakarta Timur',
            items: [
                {
                    product: {
                        id: 2,
                        name: 'ChronoFit Smart Watch',
                        category: 'Wearable',
                        price: 1850000,
                        rating: 4.8,
                        reviewsCount: 94,
                        stock: 8,
                        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
                        description: 'Smartwatch layar AMOLED Always-On 1.43 inci dengan GPS presisi tinggi.',
                        specs: ['Layar AMOLED 1.43" 60Hz'],
                    },
                    quantity: 1,
                    rated: false,
                },
            ],
        },
        {
            id: 'INV-20261118-5512',
            date: '18 Nov 2026, 10:15 WIB',
            status: 'delivered',
            courier: 'SiCepat BEST',
            resi: 'SCP004129881',
            total: 2398000,
            shippingAddress: 'Jl. Pemuda Raya No. 45, Rawamangun, Jakarta Timur',
            items: [
                {
                    product: {
                        id: 1,
                        name: 'SonicPro ANC Headphone',
                        category: 'Audio',
                        price: 1499000,
                        rating: 4.9,
                        reviewsCount: 128,
                        stock: 15,
                        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
                        description: 'Headphone nirkabel dengan Active Noise Cancellation hingga -42dB.',
                        specs: ['Bluetooth 5.4 Multi-Point'],
                    },
                    quantity: 1,
                    rated: true,
                },
                {
                    product: {
                        id: 4,
                        name: 'AirPods Buds Ultra',
                        category: 'Audio',
                        price: 899000,
                        rating: 4.7,
                        reviewsCount: 76,
                        stock: 20,
                        image: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=900&q=80',
                        description: 'TWS ultra-ringan dengan latensi rendah 45ms.',
                        specs: ['Low Latency 45ms Mode'],
                    },
                    quantity: 1,
                    rated: false,
                },
            ],
        },
    ])

    // Riwayat Rating & Ulasan User
    const reviews = useState<ProductReview[]>('account_reviews', () => [
        {
            id: 'REV-101',
            orderId: 'INV-20261118-5512',
            productId: 1,
            productName: 'SonicPro ANC Headphone',
            productImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
            rating: 5,
            comment: 'Noise cancellation-nya kedap banget buat dipakai coding dan dengerin musik. Packing aman dan pengiriman cepat.',
            date: '20 Nov 2026',
        },
    ])

    const createOrderFromCart = () => {
        if (cart.value.length === 0) return

        const randomCode = Math.floor(1000 + Math.random() * 9000)
        const newOrder: Order = {
            id: `INV-20261125-${randomCode}`,
            date: 'Baru saja',
            status: 'packed',
            courier: 'J&T Express Regular',
            resi: `JP${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            total: cartTotal.value,
            shippingAddress: user.value?.address || 'Jl. Pemuda Raya No. 45, Rawamangun, Jakarta Timur',
            items: cart.value.map((item) => ({
                product: item.product,
                quantity: item.quantity,
                rated: false,
            })),
        }

        orders.value.unshift(newOrder)
        clearCart()
    }

    const confirmOrderDelivered = (orderId: string) => {
        const order = orders.value.find((o) => o.id === orderId)
        if (!order) return
        order.status = 'delivered'
        showToast(`Pesanan ${orderId} dikonfirmasi sudah sampai!`)
    }

    const submitProductReview = (payload: {
        orderId: string
        product: Product
        rating: number
        comment: string
    }) => {
        const order = orders.value.find((o) => o.id === payload.orderId)
        if (order) {
            const targetItem = order.items.find((i) => i.product.id === payload.product.id)
            if (targetItem) targetItem.rated = true
        }

        reviews.value.unshift({
            id: `REV-${Date.now()}`,
            orderId: payload.orderId,
            productId: payload.product.id,
            productName: payload.product.name,
            productImage: payload.product.image,
            rating: payload.rating,
            comment: payload.comment,
            date: 'Hari ini',
        })

        showToast(`Rating ${payload.rating} bintang berhasil dikirim!`)
    }

    const updateProfile = (updated: AccountProfile) => {
        user.value = { ...updated }
        showToast('Data diri berhasil disimpan!')
    }

    return {
        user,
        orders,
        reviews,
        createOrderFromCart,
        confirmOrderDelivered,
        submitProductReview,
        updateProfile,
    }
}