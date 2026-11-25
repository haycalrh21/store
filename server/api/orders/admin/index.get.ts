import { desc } from 'drizzle-orm'
import { orders, orderItems } from '../../../db/schema'

export default defineEventHandler(async () => {
    const orderRows = await db.select().from(orders).orderBy(desc(orders.createdAt))

    const allItems = await db.select().from(orderItems)
    const itemsByOrderId = new Map<number, typeof allItems>()

    for (const item of allItems) {
        const list = itemsByOrderId.get(item.orderId) ?? []
        list.push(item)
        itemsByOrderId.set(item.orderId, list)
    }

    return orderRows.map((order) => ({
        ...order,
        items: itemsByOrderId.get(order.id) ?? [],
    }))
})