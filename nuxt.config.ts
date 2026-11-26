// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/icon/module',
    '@nuxt/image',
    '@nuxtjs/better-auth',
    '@nuxtjs/device',
    '@nuxtjs/google-adsense',
    '@nuxtjs/seo',
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
    '@nuxthub/core',
    '@nuxtjs/color-mode',
  ],
  vue: {
    runtimeCompiler: true,
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // FIX: lucide-vue-next di-require() sebagai CJS padahal vue itu ESM
  build: {
    transpile: ['lucide-vue-next'],
  },

  hub: {
    db: 'postgresql',
  },
  site: {
    url: 'https://nexastore.example.com', // ganti ke domain production asli
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
    // FIX: paksa package ikut di-bundle oleh Nitro
    externals: {
      inline: ['lucide-vue-next'],
    },
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