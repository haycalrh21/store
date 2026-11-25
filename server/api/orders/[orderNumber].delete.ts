import { eq, sql } from 'drizzle-orm'
import { orders, orderItems, products } from '../../db/schema'

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const orderNumber = getRouterParam(event, 'orderNumber')

    if (!orderNumber) {
        throw createError({ statusCode: 400, statusMessage: 'Nomor pesanan tidak valid' })
    }

    // 1. Cari pesanan di database
    const existing = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, orderNumber))
        .limit(1)

    if (existing.length === 0) {
        throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan' })
    }

    const order = existing[0]!

    // 2. Pastikan hanya status 'pending' yang boleh dibatalkan & dihapus
    if (order.status !== 'pending') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Pesanan yang sudah dibayar atau diproses tidak dapat dibatalkan.',
        })
    }

    // 3. Batalkan transaksi di Midtrans
    const serverKey = config.midtransServerKey || process.env.MIDTRANS_SERVER_KEY
    if (serverKey) {
        const isProd = config.public.midtransIsProduction || process.env.MIDTRANS_IS_PRODUCTION === 'true'
        const midtransCancelUrl = isProd
            ? `https://api.midtrans.com/v2/${encodeURIComponent(orderNumber)}/cancel`
            : `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(orderNumber)}/cancel`

        const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`

        try {
            const res = await $fetch<{ status_code?: string; transaction_status?: string; status_message?: string }>(
                midtransCancelUrl,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        Authorization: authHeader,
                    },
                }
            )

            // Jika ternyata di Midtrans sudah terlanjur dibayar (settlement/capture), batalkan proses hapus
            if (res.transaction_status === 'settlement' || res.transaction_status === 'capture') {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'Pembayaran sudah diterima oleh Midtrans, pesanan tidak bisa dibatalkan.',
                })
            }
        } catch (err: any) {
            const code = err?.statusCode || err?.response?.status
            // 404 = user tutup popup Snap sebelum pilih metode bayar; 412 = sudah expire/cancel di Midtrans
            // Selain 404 & 412, lempar error ke frontend
            if (code !== 404 && code !== 412) {
                throw createError({
                    statusCode: 502,
                    statusMessage: err?.data?.status_message || err?.statusMessage || 'Gagal membatalkan transaksi di Midtrans.',
                })
            }
        }
    }

    // 4. Kembalikan stok produk & hapus pesanan dari database
    await db.transaction(async (tx) => {
        const items = await tx
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id))

        for (const item of items) {
            if (item.productId) {
                await tx
                    .update(products)
                    .set({
                        stock: sql`${products.stock} + ${item.quantity}`,
                    })
                    .where(eq(products.id, item.productId))
            }
        }

        await tx.delete(orders).where(eq(orders.id, order.id))
    })

    return { deleted: true, orderNumber }
})