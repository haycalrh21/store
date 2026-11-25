import { pgTable, text, serial, integer, timestamp } from 'drizzle-orm/pg-core'
import { user } from '#auth/schema'

export const posts = pgTable('posts', {
    id: serial().primaryKey(),
    title: text().notNull(),
    userId: text().notNull().references(() => user.id),
})

export const products = pgTable('products', {
    id: serial().primaryKey(),
    name: text().notNull(),
    category: text().notNull(),
    price: integer().notNull(), // harga akhir setelah diskon
    originalPrice: integer(),
    discount: integer(),
    stock: integer().notNull().default(0),
    badge: text(),
    image: text().notNull(), // foto utama
    images: text().array().notNull().default([]),
    description: text().notNull(),
    specs: text().array().notNull().default([]),
    createdAt: timestamp().defaultNow().notNull(),
})

export const orders = pgTable('orders', {
    id: serial().primaryKey(),
    orderNumber: text().notNull().unique(), // Contoh: NX-847291
    userId: text().references(() => user.id, { onDelete: 'set null' }), // Opsional jika guest checkout

    // Data Penerima & Pengiriman (Teks ringkas, tanpa tabel wilayah RajaOngkir)
    customerName: text().notNull(),
    customerEmail: text().notNull(),
    customerPhone: text().notNull(),
    shippingAddress: text().notNull(),
    shippingNotes: text(),
    shippingCourier: text().notNull(), // Contoh: "JNE - REG (Layanan Reguler)"

    // Rincian Nominal & Midtrans
    subtotal: integer().notNull(),
    shippingCost: integer().notNull().default(0),
    insuranceCost: integer().notNull().default(0),
    discountAmount: integer().notNull().default(0),
    grandTotal: integer().notNull(),

    status: text().notNull().default('pending'), // 'pending' | 'paid' | 'failed' | 'shipped' | 'completed'
    paymentMethod: text(), // Contoh: 'BCA VA', 'QRIS', 'GOPAY'
    snapToken: text(), // Token Midtrans Snap jika pembeli ingin lanjut bayar nanti

    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().notNull(),
})

export const orderItems = pgTable('order_items', {
    id: serial().primaryKey(),
    orderId: integer()
        .notNull()
        .references(() => orders.id, { onDelete: 'cascade' }),
    productId: integer().references(() => products.id, { onDelete: 'set null' }),

    // Snapshot produk saat transaksi terjadi
    productName: text().notNull(),
    productImage: text().notNull(),
    price: integer().notNull(),
    quantity: integer().notNull(),
})

export const userProfiles = pgTable('user_profiles', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull().unique(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').default(''),
    city: text('city').default(''),
    address: text('address').default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})