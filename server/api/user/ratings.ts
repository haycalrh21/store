
// api/user/ratings.ts
import { and, desc, eq } from 'drizzle-orm'
import { orders, productRatings } from '../../db/schema'

const DELIVERED_STATUSES = ['delivered', 'sudah sampai', 'sampai', 'selesai']

export default defineEventHandler(async (event) => {
    const session = await getUserSession(event)
    const sessionUser = session?.user as { id?: string; name?: string; email?: string } | undefined

    if (!sessionUser?.id) {
        throw createError({ statusCode: 401, statusMessage: 'Silakan login terlebih dahulu.' })
    }

    // GET: Ambil riwayat rating milik user yang sedang login
    if (event.method === 'GET') {
        const rows = await db
            .select()
            .from(productRatings)
            .where(eq(productRatings.userId, sessionUser.id))
            .orderBy(desc(productRatings.createdAt))

        return rows
    }

    // POST: Simpan rating bintang & komentar untuk item pesanan yang sudah sampai
    if (event.method === 'POST') {
        const body = await readBody<{
            orderId?: number
            orderNumber?: string
            productId?: number | null
            productName?: string
            productImage?: string
            rating?: number
            comment?: string
        }>(event)

        const orderId = Number(body?.orderId)
        const orderNumber = String(body?.orderNumber || '').trim()
        const productId = body?.productId != null ? Number(body.productId) : null
        const productName = String(body?.productName || '').trim()
        const productImage = String(body?.productImage || '').trim()
        const rating = Math.min(Math.max(Math.round(Number(body?.rating) || 0), 1), 5)
        const comment =
            String(body?.comment || '').trim() ||
            'Produk original, kualitas mantap dan sesuai deskripsi!'

        if (!orderId || !orderNumber || !productName) {
            throw createError({ statusCode: 400, statusMessage: 'Data pesanan atau produk tidak lengkap.' })
        }

        // Pastikan pesanan milik user ini dan status pengirimannya sudah sampai
        const [targetOrder] = await db
            .select()
            .from(orders)
            .where(and(eq(orders.id, orderId), eq(orders.userId, sessionUser.id)))
            .limit(1)

        if (!targetOrder) {
            throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan.' })
        }

        const shipStatus = String(targetOrder.statusPengiriman || '').trim().toLowerCase()
        if (!DELIVERED_STATUSES.includes(shipStatus)) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Penilaian hanya dapat diberikan setelah pesanan berstatus Sudah Sampai.',
            })
        }

        // Cek apakah produk pada order ini sudah pernah dinilai
        const existing = await db
            .select({ id: productRatings.id })
            .from(productRatings)
            .where(
                and(
                    eq(productRatings.userId, sessionUser.id),
                    eq(productRatings.orderId, orderId),
                    eq(productRatings.productName, productName)
                )
            )
            .limit(1)

        if (existing.length > 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Produk pada pesanan ini sudah pernah kamu beri penilaian.',
            })
        }

        const [saved] = await db
            .insert(productRatings)
            .values({
                userId: sessionUser.id,
                orderId,
                orderNumber,
                productId,
                productName,
                productImage,
                customerName: sessionUser.name || targetOrder.customerName || 'Pelanggan',
                rating,
                comment,
            })
            .returning()

        return saved
    }
})