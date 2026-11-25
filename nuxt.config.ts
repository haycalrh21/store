// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/icon/module', '@nuxt/image', '@nuxtjs/better-auth', '@nuxtjs/device', '@nuxtjs/google-adsense', '@nuxtjs/seo', '@nuxtjs/tailwindcss', 'shadcn-nuxt', '@nuxthub/core', '@nuxtjs/color-mode'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  hub: {
    db: 'postgresql',
  },
  site: {
    url: 'https://nexastore.example.com',
    name: 'NEXASTORE',
    description: 'Toko online terpercaya',
  },
  tailwindcss: {
    config: {
      darkMode: 'class',
    },
  },
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
  },
  css: ['~/assets/css/main.css'],
  nitro: {
    routeRules: {
      '/admin/**': { auth: { user: { role: 'admin' } } },
    },
  },
  runtimeConfig: {
    s3: {
      bucket: '',
      publicUrl: '',
    },
    midtransServerKey: process.env.MIDTRANS_SERVER_KEY || '',
    // Terbaca di client/browser
    public: {
      midtransClientKey: process.env.MIDTRANS_CLIENT_KEY || '',
      midtransIsProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    },
  },
})
