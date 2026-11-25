// server/api/admin/products/[id].delete.ts
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { db } from 'hub:db'
import { eq } from 'drizzle-orm'
import { products } from '~~/server/db/schema'

export default eventHandler(async (event) => {
    await requireUserSession(event, { user: { role: 'admin' } })

    const id = Number(getRouterParam(event, 'id'))
    if (!Number.isInteger(id) || id < 1) {
        throw createError({ statusCode: 400, statusMessage: 'ID produk tidak valid.' })
    }

    const [deleted] = await db.delete(products).where(eq(products.id, id)).returning()
    if (!deleted) {
        throw createError({ statusCode: 404, statusMessage: 'Produk tidak ditemukan.' })
    }

    // hapus foto dari bucket (best effort: kalau gagal, produk tetap terhapus)
    const { s3, bucket, publicUrl } = useS3()
    const prefix = `${publicUrl}/`

    for (const url of deleted.images) {
        if (!url.startsWith(prefix)) continue
        try {
            await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: url.slice(prefix.length) }))
        } catch (e) {
            console.error('Gagal menghapus foto dari bucket:', url, e)
        }
    }

    return { ok: true }
})