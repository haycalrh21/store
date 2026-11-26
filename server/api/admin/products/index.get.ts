import { desc, sql } from 'drizzle-orm'
import { products, productRatings } from '../../../db/schema'

export default defineEventHandler(async () => {
    const rows = await db
        .select({
            id: products.id,
            name: products.name,
            category: products.category,
            price: products.price,
            originalPrice: products.originalPrice,
            discount: products.discount,
            stock: products.stock,
            image: products.image,
            images: products.images,
            badge: products.badge,
            description: products.description,
            specs: products.specs,
            createdAt: products.createdAt,
            rating: sql<number>`COALESCE(ROUND(AVG(${productRatings.rating})::numeric, 1), 0)::float`,
            reviewsCount: sql<number>`COUNT(${productRatings.id})::int`,
        })
        .from(products)
        .leftJoin(
            productRatings,
            sql`${productRatings.productId} = ${products.id} OR LOWER(TRIM(${productRatings.productName})) = LOWER(TRIM(${products.name}))`
        )
        .groupBy(products.id)
        .orderBy(desc(products.id))

    return rows
})