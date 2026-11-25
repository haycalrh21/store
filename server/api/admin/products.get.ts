// server/api/admin/products.get.ts
import { db } from 'hub:db'
import { desc } from 'drizzle-orm'
import { products } from '../../db/schema'

export default eventHandler(() =>
    db.select().from(products).orderBy(desc(products.createdAt)),
)