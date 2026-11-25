let cachedJakartaTimurId: string | null = null

async function getJakartaTimurOriginId(apiKey: string): Promise<string> {
    if (cachedJakartaTimurId) return cachedJakartaTimurId

    const res = await $fetch<{
        data?: Array<{ id: number; city_name?: string; label?: string }>
    }>('https://rajaongkir.komerce.id/api/v1/destination/domestic-destination', {
        headers: { key: apiKey },
        query: {
            search: 'jakarta timur',
            limit: 5,
            offset: 0,
        },
    })

    const match =
        res.data?.find((item) => item.city_name?.toLowerCase().includes('jakarta timur')) ??
        res.data?.[0]

    if (!match?.id) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Gagal mendapatkan ID lokasi asal Jakarta Timur dari RajaOngkir',
        })
    }

    cachedJakartaTimurId = String(match.id)
    return cachedJakartaTimurId
}

export default defineEventHandler(async (event) => {
    const body = await readBody<{
        destinationId: number | string
        weight?: number
        courier?: string
    }>(event)

    if (!body?.destinationId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'ID lokasi tujuan wajib diisi',
        })
    }

    const apiKey = process.env.RAJAONGKIR_API_KEY
    if (!apiKey) {
        throw createError({
            statusCode: 500,
            statusMessage: 'RAJAONGKIR_API_KEY belum dikonfigurasi di .env',
        })
    }

    const originId = await getJakartaTimurOriginId(apiKey)

    const formBody = new URLSearchParams({
        origin: originId,
        destination: String(body.destinationId),
        weight: String(Math.max(100, body.weight || 1000)),
        courier: body.courier || 'jne:jnt:sicepat:pos:tiki',
    })

    const res = await $fetch<{
        data?: Array<{
            name: string
            code: string
            service: string
            description: string
            cost: number
            etd: string
        }>
    }>('https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost', {
        method: 'POST',
        headers: {
            key: apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
    })

    return res.data ?? []
})