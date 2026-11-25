export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const origin = getRequestURL(event).origin // otomatis http://localhost:3000 atau domain produksi
    const body = await readBody<{
        orderId: string
        grossAmount: number
        customer: {
            fullName: string
            email: string
            phone: string
            address: string
            city: string
            postalCode?: string
        }
        items: Array<{
            id: string | number
            name: string
            price: number
            quantity: number
        }>
        shippingCost: number
        insuranceCost: number
        discountAmount: number
    }>(event)

    const serverKey = config.midtransServerKey || process.env.MIDTRANS_SERVER_KEY
    if (!serverKey) {
        throw createError({
            statusCode: 500,
            statusMessage: 'MIDTRANS_SERVER_KEY belum diatur di file .env',
        })
    }

    const itemDetails = body.items.map((item) => ({
        id: String(item.id),
        price: Math.round(item.price),
        quantity: item.quantity,
        name: item.name.slice(0, 50),
    }))

    if (body.shippingCost > 0) {
        itemDetails.push({ id: 'SHIPPING', price: Math.round(body.shippingCost), quantity: 1, name: 'Ongkos Kirim' })
    }
    if (body.insuranceCost > 0) {
        itemDetails.push({ id: 'INSURANCE', price: Math.round(body.insuranceCost), quantity: 1, name: 'Asuransi Pengiriman' })
    }
    if (body.discountAmount > 0) {
        itemDetails.push({ id: 'DISCOUNT', price: -Math.round(body.discountAmount), quantity: 1, name: 'Diskon Promo' })
    }

    const calculatedGross = itemDetails.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const isProd = config.public.midtransIsProduction || process.env.MIDTRANS_IS_PRODUCTION === 'true'
    const snapApiUrl = isProd
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

    const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`

    const res = await $fetch<{ token: string; redirect_url: string }>(snapApiUrl, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: authHeader,
        },
        body: {
            transaction_details: {
                order_id: body.orderId,
                gross_amount: calculatedGross,
            },
            item_details: itemDetails,
            customer_details: {
                first_name: body.customer.fullName,
                email: body.customer.email,
                phone: body.customer.phone,
                shipping_address: {
                    first_name: body.customer.fullName,
                    phone: body.customer.phone,
                    address: body.customer.address,
                    city: body.customer.city,
                    postal_code: body.customer.postalCode || '',
                    country_code: 'IDN',
                },
            },
            // Override Finish URL bawaan Midtrans (example.com) agar langsung ke /dashboard/pesanan
            callbacks: {
                finish: `${origin}/dashboard/pesanan`,
                error: `${origin}/dashboard/pesanan`,
            },
        },
    })

    return {
        token: res.token,
        redirectUrl: res.redirect_url,
    }
})