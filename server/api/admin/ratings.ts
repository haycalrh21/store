import { desc } from 'drizzle-orm'
import { productRatings } from '../../db/schema'

export default defineEventHandler(async (event) => {
    const session = await getUserSession(event)
    const currentUser = session?.user as { id?: string; role?: string } | undefined

    if (!currentUser?.id || currentUser.role?.toLowerCase() !== 'admin') {
        throw createError({ statusCode: 403, statusMessage: 'Akses ditolak.' })
    }

    return await db
        .select()
        .from(productRatings)
        .orderBy(desc(productRatings.createdAt))
})