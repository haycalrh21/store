import { eq, sql } from 'drizzle-orm'
import { orders, orderItems, products } from '../../db/schema'

export default defineEventHandler(async (event) => {
    const session = await getUserSession(event)
    const body = await readBody<{
        orderNumber: string
        status?: 'pending' | 'paid' | 'failed' | 'shipped' | 'delivered'
        paymentMethod?: string
        snapToken?: string
        customerName?: string
        customerEmail?: string
        customerPhone?: string
        shippingAddress?: string
        shippingNotes?: string
        shippingCourier?: string
        subtotal?: number
        shippingCost?: number
        insuranceCost?: number
        discountAmount?: number
        grandTotal?: number
        items?: Array<{
            id: number
            name: string
            image: string
            price: number
            quantity: number
        }>
    }>(event)

    if (!body?.orderNumber) {
        throw createError({ statusCode: 400, statusMessage: 'Nomor pesanan wajib diisi' })
    }

    // Cek apakah orderNumber sudah ada di database (untuk update status bayar / konfirmasi sampai)
    const existing = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, body.orderNumber))
        .limit(1)

    if (existing.length > 0) {
        const current = existing[0]!
        const [updated] = await db
            .update(orders)
            .set({
                status: body.status ?? current.status,
                paymentMethod: body.paymentMethod ?? current.paymentMethod,
                snapToken: body.snapToken ?? current.snapToken,
                updatedAt: new Date(),
            })
            .where(eq(orders.orderNumber, body.orderNumber))
            .returning()

        return updated
    }

    if (!body.items?.length) {
        throw createError({ statusCode: 400, statusMessage: 'Item pesanan tidak boleh kosong' })
    }

    // Insert order baru + item + kurangi stok
    const createdOrder = await db.transaction(async (tx) => {
        const [newOrder] = await tx
            .insert(orders)
            .values({
                orderNumber: body.orderNumber,
                userId: session?.user?.id ?? null,
                customerName: body.customerName || 'Pelanggan',
                customerEmail: body.customerEmail || '',
                customerPhone: body.customerPhone || '',
                shippingAddress: body.shippingAddress || '',
                shippingNotes: body.shippingNotes || null,
                shippingCourier: body.shippingCourier || '',
                subtotal: Math.round(body.subtotal || 0),
                shippingCost: Math.round(body.shippingCost || 0),
                insuranceCost: Math.round(body.insuranceCost || 0),
                discountAmount: Math.round(body.discountAmount || 0),
                grandTotal: Math.round(body.grandTotal || 0),
                status: body.status || 'pending',
                paymentMethod: body.paymentMethod || null,
                snapToken: body.snapToken || null,
            })
            .returning()

        await tx.insert(orderItems).values(
            body.items!.map((item) => ({
                orderId: newOrder!.id,
                productId: item.id,
                productName: item.name,
                productImage: item.image,
                price: Math.round(item.price),
                quantity: item.quantity,
            }))
        )

        for (const item of body.items!) {
            await tx
                .update(products)
                .set({
                    stock: sql`GREATEST(0, ${products.stock} - ${item.quantity})`,
                })
                .where(eq(products.id, item.id))
        }

        return newOrder
    })

    return createdOrder
})