export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const search = String(query.search || '').trim()

    if (search.length < 3) {
        return []
    }

    const apiKey = process.env.RAJAONGKIR_API_KEY
    if (!apiKey) {
        throw createError({
            statusCode: 500,
            statusMessage: 'RAJAONGKIR_API_KEY belum dikonfigurasi di .env',
        })
    }

    const res = await $fetch<{
        data?: Array<{
            id: number
            label: string
            province_name: string
            city_name: string
            district_name: string
            subdistrict_name: string
            zip_code: string
        }>
    }>('https://rajaongkir.komerce.id/api/v1/destination/domestic-destination', {
        headers: { key: apiKey },
        query: {
            search,
            limit: 10,
            offset: 0,
        },
    })

    return res.data ?? []
})