import { asc, eq, sql } from 'drizzle-orm'
import { categories, products } from '../../db/schema'

const toSlug = (text: string) =>
    text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

export default defineEventHandler(async (event) => {
    // GET: Ambil seluruh kategori + hitung jumlah produk per kategori
    if (event.method === 'GET') {
        const [allCategories, allProducts] = await Promise.all([
            db.select().from(categories).orderBy(asc(categories.name)),
            db.select({ category: products.category }).from(products),
        ])

        const countMap = new Map<string, number>()
        for (const p of allProducts) {
            const catName = String(p.category || '').trim()
            if (!catName) continue
            countMap.set(catName.toLowerCase(), (countMap.get(catName.toLowerCase()) ?? 0) + 1)
        }

        return allCategories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            productCount: countMap.get(c.name.toLowerCase()) ?? 0,
            createdAt: c.createdAt,
        }))
    }

    // Pastikan hanya Admin yang dapat menambah kategori
    const session = await getUserSession(event)
    const currentUser = session?.user as { id?: string; role?: string } | undefined

    if (!currentUser?.id || currentUser.role?.toLowerCase() !== 'admin') {
        throw createError({
            statusCode: 403,
            statusMessage: 'Akses ditolak. Hanya Admin yang dapat mengelola kategori.',
        })
    }

    // POST: Tambah kategori baru ke database
    if (event.method === 'POST') {
        const body = await readBody<{ name?: string }>(event)
        const name = String(body?.name || '').trim()

        if (!name) {
            throw createError({ statusCode: 400, statusMessage: 'Nama kategori wajib diisi.' })
        }

        const slug = toSlug(name)

        const existing = await db
            .select()
            .from(categories)
            .where(sql`LOWER(${categories.name}) = LOWER(${name})`)
            .limit(1)

        if (existing.length > 0) {
            throw createError({ statusCode: 400, statusMessage: `Kategori "${name}" sudah ada.` })
        }

        const [created] = await db
            .insert(categories)
            .values({ name, slug })
            .returning()

        return created
    }
})