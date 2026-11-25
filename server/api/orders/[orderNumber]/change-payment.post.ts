import { eq } from 'drizzle-orm'
import { orders, orderItems } from '../../../db/schema'

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const origin = getRequestURL(event).origin
    const oldOrderNumber = getRouterParam(event, 'orderNumber')

    if (!oldOrderNumber) {
        throw createError({ statusCode: 400, statusMessage: 'Nomor pesanan tidak valid' })
    }

    // 1. Ambil pesanan & item dari database
    const existing = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, oldOrderNumber))
        .limit(1)

    if (existing.length === 0) {
        throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan' })
    }

    const order = existing[0]!

    if (order.status !== 'pending') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Hanya pesanan yang belum dibayar yang dapat mengganti metode pembayaran.',
        })
    }

    const serverKey = config.midtransServerKey || process.env.MIDTRANS_SERVER_KEY
    if (!serverKey) {
        throw createError({ statusCode: 500, statusMessage: 'MIDTRANS_SERVER_KEY belum diatur' })
    }

    const isProd = config.public.midtransIsProduction || process.env.MIDTRANS_IS_PRODUCTION === 'true'
    const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`

    // 2. Batalkan transaksi pending lama di Midtrans agar VA/QRIS sebelumnya hangus
    const cancelUrl = isProd
        ? `https://api.midtrans.com/v2/${encodeURIComponent(oldOrderNumber)}/cancel`
        : `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(oldOrderNumber)}/cancel`

    try {
        const cancelRes = await $fetch<{ transaction_status?: string }>(cancelUrl, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: authHeader,
            },
        })

        if (cancelRes.transaction_status === 'settlement' || cancelRes.transaction_status === 'capture') {
            throw createError({
                statusCode: 400,
                statusMessage: 'Transaksi lama sudah dibayar. Silakan muat ulang halaman.',
            })
        }
    } catch (err: any) {
        const code = err?.statusCode || err?.response?.status
        if (code !== 404 && code !== 412) {
            throw createError({
                statusCode: 502,
                statusMessage: err?.data?.status_message || err?.statusMessage || 'Gagal membatalkan tagihan lama di Midtrans.',
            })
        }
    }

    // 3. Susun ulang item_details & buat token Snap baru dengan order_id baru
    const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id))

    const itemDetails = items.map((item) => ({
        id: String(item.productId ?? item.id),
        price: Math.round(item.price),
        quantity: item.quantity,
        name: item.productName.slice(0, 50),
    }))

    if (order.shippingCost > 0) {
        itemDetails.push({ id: 'SHIPPING', price: Math.round(order.shippingCost), quantity: 1, name: 'Ongkos Kirim' })
    }
    if (order.insuranceCost > 0) {
        itemDetails.push({ id: 'INSURANCE', price: Math.round(order.insuranceCost), quantity: 1, name: 'Asuransi Pengiriman' })
    }
    if (order.discountAmount > 0) {
        itemDetails.push({ id: 'DISCOUNT', price: -Math.round(order.discountAmount), quantity: 1, name: 'Diskon Promo' })
    }

    const calculatedGross = itemDetails.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const newOrderNumber = `NX-${Date.now().toString().slice(-6)}`
    const snapApiUrl = isProd
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

    const snapRes = await $fetch<{ token: string; redirect_url: string }>(snapApiUrl, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: authHeader,
        },
        body: {
            transaction_details: {
                order_id: newOrderNumber,
                gross_amount: calculatedGross,
            },
            item_details: itemDetails,
            customer_details: {
                first_name: order.customerName,
                email: order.customerEmail,
                phone: order.customerPhone,
                shipping_address: {
                    first_name: order.customerName,
                    phone: order.customerPhone,
                    address: order.shippingAddress,
                    country_code: 'IDN',
                },
            },
            callbacks: {
                finish: `${origin}/dashboard/pesanan`,
                error: `${origin}/dashboard/pesanan`,
            },
        },
    })

    // 4. Update orderNumber & snapToken baru di database
    await db
        .update(orders)
        .set({
            orderNumber: newOrderNumber,
            snapToken: snapRes.token,
            paymentMethod: null,
            updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id))

    return {
        orderNumber: newOrderNumber,
        token: snapRes.token,
    }
})