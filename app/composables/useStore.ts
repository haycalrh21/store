export interface Product {
    id: number
    name: string
    category: string
    price: number
    originalPrice?: number
    discount?: number
    rating: number
    reviewsCount: number
    stock: number
    image: string
    images?: string[]
    badge?: string
    description: string
    specs: string[]
}

export interface CartItem {
    product: Product
    quantity: number
}

export interface UserProfile {
    name: string
    email: string
}

const CART_STORAGE_KEY = 'nexastore_cart_v1'

export const useStore = () => {
    const cart = useState<CartItem[]>('cart', () => [])
    const isCartHydrated = useState<boolean>('cart_hydrated', () => false)
    const isCartOpen = useState<boolean>('isCartOpen', () => false)
    const toastMessage = useState<string>('toastMessage', () => '')
    const user = useState<UserProfile | null>('user', () => null)

    // Muat keranjang dari localStorage & sinkronkan otomatis di browser
    if (import.meta.client && !isCartHydrated.value) {
        isCartHydrated.value = true
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved)
                if (Array.isArray(parsed)) {
                    cart.value = parsed
                }
            }
        } catch {
            localStorage.removeItem(CART_STORAGE_KEY)
        }

        watch(
            cart,
            (newCart) => {
                try {
                    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart))
                } catch {
                    // Abaikan jika storage penuh
                }
            },
            { deep: true }
        )
    }

    const showToast = (message: string) => {
        toastMessage.value = message
        setTimeout(() => {
            if (toastMessage.value === message) {
                toastMessage.value = ''
            }
        }, 2500)
    }

    const addToCart = (product: Product, quantity = 1) => {
        if (product.stock <= 0) {
            showToast('Maaf, stok produk ini sedang habis.')
            return
        }
        const existing = cart.value.find((item) => item.product.id === product.id)
        if (existing) {
            existing.quantity = Math.min(product.stock, existing.quantity + quantity)
        } else {
            cart.value.push({ product, quantity: Math.min(product.stock, quantity) })
        }
        showToast(`${product.name} (${quantity}x) masuk ke keranjang!`)
    }

    const updateQuantity = (productId: number, delta: number) => {
        const index = cart.value.findIndex((item) => item.product.id === productId)
        const item = cart.value[index]
        if (!item) return

        const newQty = item.quantity + delta
        if (newQty <= 0) {
            cart.value.splice(index, 1)
        } else {
            item.quantity = Math.min(item.product.stock, newQty)
        }
    }

    const removeFromCart = (productId: number) => {
        cart.value = cart.value.filter((item) => item.product.id !== productId)
    }

    const clearCart = () => {
        cart.value = []
        if (import.meta.client) {
            localStorage.removeItem(CART_STORAGE_KEY)
        }
    }

    const cartCount = computed(() =>
        cart.value.reduce((total, item) => total + item.quantity, 0)
    )

    const cartTotal = computed(() =>
        cart.value.reduce((total, item) => total + item.product.price * item.quantity, 0)
    )

    const loginUser = (email: string, name?: string) => {
        const displayName = name || email.split('@')[0] || 'User'
        user.value = { name: displayName, email }
        showToast(`Selamat datang kembali, ${displayName}!`)
    }

    const logoutUser = () => {
        user.value = null
        showToast('Kamu telah keluar dari akun.')
    }

    const formatRupiah = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(value)
    }

    return {
        cart,
        isCartOpen,
        toastMessage,
        user,
        cartCount,
        cartTotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        loginUser,
        logoutUser,
        showToast,
        formatRupiah,
    }
}