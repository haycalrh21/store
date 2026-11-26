import { desc, sql } from 'drizzle-orm'
import { products, productRatings } from '../../../../db/schema'

export default defineEventHandler(async (event) => {
    const id = Number(getRouterParam(event, 'id'))
    if (!id || Number.isNaN(id)) {
        throw createError({ statusCode: 400, statusMessage: 'ID produk tidak valid' })
    }

    const [product] = await db
        .select({ id: products.id, name: products.name })
        .from(products)
        .where(sql`${products.id} = ${id}`)
        .limit(1)

    if (!product) {
        return { averageRating: 0, totalReviews: 0, reviews: [] }
    }

    const reviews = await db
        .select({
            id: productRatings.id,
            userId: productRatings.userId,
            orderId: productRatings.orderId,
            orderNumber: productRatings.orderNumber,
            productId: productRatings.productId,
            productName: productRatings.productName,
            productImage: productRatings.productImage,
            customerName: productRatings.customerName,
            rating: productRatings.rating,
            comment: productRatings.comment,
            createdAt: productRatings.createdAt,
        })
        .from(productRatings)
        .where(
            sql`${productRatings.productId} = ${product.id} OR LOWER(TRIM(${productRatings.productName})) = LOWER(TRIM(${product.name}))`
        )
        .orderBy(desc(productRatings.createdAt))

    const totalReviews = reviews.length
    const averageRating =
        totalReviews > 0
            ? Number((reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / totalReviews).toFixed(1))
            : 0

    return {
        averageRating,
        totalReviews,
        reviews,
    }
})