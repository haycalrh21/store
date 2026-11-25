import { desc, eq, inArray } from 'drizzle-orm'
import { orders, orderItems } from '../../db/schema'

export default defineEventHandler(async (event) => {
    const session = await getUserSession(event)

    const orderList = session?.user?.id
        ? await db
            .select()
            .from(orders)
            .where(eq(orders.userId, session.user.id))
            .orderBy(desc(orders.createdAt))
        : await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(20)

    if (orderList.length === 0) return []

    const orderIds = orderList.map((o) => o.id)
    const items = await db
        .select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds))

    return orderList.map((order) => ({
        ...order,
        items: items.filter((item) => item.orderId === order.id),
    }))
})