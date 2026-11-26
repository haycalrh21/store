import { desc, eq, inArray } from 'drizzle-orm'
import { orders, orderItems } from '../../db/schema'

export default defineEventHandler(async (event) => {
    const session = await getUserSession(event)
    const sessionUser = session?.user as { id?: string } | undefined

    if (!sessionUser?.id) {
        throw createError({ statusCode: 401, statusMessage: 'Silakan login terlebih dahulu.' })
    }

    const userOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, sessionUser.id))
        .orderBy(desc(orders.createdAt))

    if (userOrders.length === 0) {
        return []
    }

    const orderIds = userOrders.map((o) => o.id)
    const allItems = await db
        .select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds))

    return userOrders.map((order) => ({
        ...order,
        items: allItems.filter((item) => item.orderId === order.id),
    }))
})