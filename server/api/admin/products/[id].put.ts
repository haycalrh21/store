import { eq } from 'drizzle-orm'
import { products } from '../../../db/schema'

export default defineEventHandler(async (event) => {
    const id = Number(getRouterParam(event, 'id'))
    if (!id || Number.isNaN(id)) {
        throw createError({ statusCode: 400, statusMessage: 'ID produk tidak valid' })
    }

    const body = await readBody(event)

    const [updated] = await db
        .update(products)
        .set({
            name: body.name,
            category: body.category,
            price: Number(body.price),
            originalPrice: body.originalPrice ? Number(body.originalPrice) : null,
            discount: body.discount ? Number(body.discount) : null,
            stock: Number(body.stock),
            badge: body.badge || null,
            image: body.image,
            images: Array.isArray(body.images) ? body.images : [],
            description: body.description || '',
            specs: Array.isArray(body.specs) ? body.specs : [],
        })
        .where(eq(products.id, id))
        .returning()

    if (!updated) {
        throw createError({ statusCode: 404, statusMessage: 'Produk tidak ditemukan' })
    }

    return updated
})