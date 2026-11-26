import { eq } from 'drizzle-orm'
import { productRatings } from '../../../db/schema'

export default defineEventHandler(async (event) => {
    const session = await getUserSession(event)
    const currentUser = session?.user as { id?: string; role?: string } | undefined

    if (!currentUser?.id || currentUser.role?.toLowerCase() !== 'admin') {
        throw createError({ statusCode: 403, statusMessage: 'Akses ditolak.' })
    }

    const id = Number(getRouterParam(event, 'id'))
    if (!id || Number.isNaN(id)) {
        throw createError({ statusCode: 400, statusMessage: 'ID ulasan tidak valid.' })
    }

    if (event.method === 'DELETE') {
        await db.delete(productRatings).where(eq(productRatings.id, id))
        return { ok: true }
    }
})
