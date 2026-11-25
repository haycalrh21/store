// server/api/admin/products.post.ts
import { db } from 'hub:db'
import { products } from '~~/server/db/schema'

export default eventHandler(async (event) => {
    await requireUserSession(event, { user: { role: 'admin' } })

    const body = await readBody(event)

    const name = String(body.name ?? '').trim()
    const price = Math.round(Number(body.price))
    const discount = Math.min(Math.max(Math.round(Number(body.discount) || 0), 0), 99)
    const stock = Math.max(Math.round(Number(body.stock) || 0), 0)
    const images: string[] = Array.isArray(body.images) ? body.images.map(String) : []
    const specs: string[] = Array.isArray(body.specs) ? body.specs.map(String) : []

    if (!name || !Number.isFinite(price) || price < 1) {
        throw createError({ statusCode: 400, statusMessage: 'Nama dan harga wajib diisi.' })
    }

    const primaryImage = images[0]
    if (!primaryImage) {
        throw createError({ statusCode: 400, statusMessage: 'Minimal 1 foto produk.' })
    }

    // harga akhir dihitung di server, jangan percaya angka dari browser
    const finalPrice = discount > 0 ? price - Math.round((price * discount) / 100) : price

    try {
        const [row] = await db.insert(products).values({
            name,
            category: String(body.category ?? 'Aksesoris'),
            price: finalPrice,
            originalPrice: discount > 0 ? price : null,
            discount: discount > 0 ? discount : null,
            stock,
            badge: body.badge ? String(body.badge) : discount > 0 ? `Diskon ${discount}%` : null,
            image: primaryImage,
            images,
            description: String(body.description ?? '').trim() || 'Produk unggulan NEXASTORE dengan kualitas terjamin.',
            specs: specs.length ? specs : ['Garansi Resmi 1 Tahun'],
        }).returning()

        return row
    } catch (e: any) {
        const detail = String(e?.cause?.message ?? e?.message ?? e)
        console.error('INSERT ERROR:', e?.cause ?? e)
        throw createError({
            statusCode: 500,
            // saat development, tampilkan penyebab aslinya langsung di browser
            statusMessage: import.meta.dev ? `Gagal menyimpan produk: ${detail}` : 'Gagal menyimpan produk.',
        })
    }
})