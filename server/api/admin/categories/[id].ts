import { eq, sql } from 'drizzle-orm'
import { categories, products } from '../../../db/schema'

const toSlug = (text: string) =>
    text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

export default defineEventHandler(async (event) => {
    const session = await getUserSession(event)
    const currentUser = session?.user as { id?: string; role?: string } | undefined

    if (!currentUser?.id || currentUser.role?.toLowerCase() !== 'admin') {
        throw createError({
            statusCode: 403,
            statusMessage: 'Akses ditolak. Hanya Admin yang dapat mengelola kategori.',
        })
    }

    const rawId = getRouterParam(event, 'id')
    const categoryId = Number(rawId)

    if (!rawId || Number.isNaN(categoryId)) {
        throw createError({ statusCode: 400, statusMessage: 'ID kategori tidak valid.' })
    }

    const [existing] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1)

    if (!existing) {
        throw createError({ statusCode: 404, statusMessage: 'Kategori tidak ditemukan.' })
    }

    // PUT / PATCH: Update nama & slug kategori + sinkronkan ke tabel products
    if (event.method === 'PUT' || event.method === 'PATCH') {
        const body = await readBody<{ name?: string }>(event)
        const nextName = String(body?.name || '').trim()

        if (!nextName) {
            throw createError({ statusCode: 400, statusMessage: 'Nama kategori baru wajib diisi.' })
        }

        const duplicate = await db
            .select()
            .from(categories)
            .where(sql`LOWER(${categories.name}) = LOWER(${nextName}) AND ${categories.id} != ${categoryId}`)
            .limit(1)

        if (duplicate.length > 0) {
            throw createError({ statusCode: 400, statusMessage: `Kategori "${nextName}" sudah digunakan.` })
        }

        const nextSlug = toSlug(nextName)

        const [updated] = await db
            .update(categories)
            .set({ name: nextName, slug: nextSlug, updatedAt: new Date() })
            .where(eq(categories.id, categoryId))
            .returning()

        // Perbarui juga nama kategori pada produk yang memakai kategori lama
        await db
            .update(products)
            .set({ category: nextName })
            .where(eq(products.category, existing.name))

        return updated
    }

    // DELETE: Hapus kategori dari database
    if (event.method === 'DELETE') {
        const linkedProducts = await db
            .select({ id: products.id })
            .from(products)
            .where(eq(products.category, existing.name))
            .limit(1)

        if (linkedProducts.length > 0) {
            throw createError({
                statusCode: 400,
                statusMessage: `Kategori "${existing.name}" masih digunakan oleh produk dan tidak bisa dihapus.`,
            })
        }

        await db.delete(categories).where(eq(categories.id, categoryId))

        return { ok: true }
    }
})