import { defineClientAuth } from '@nuxtjs/better-auth/config'
import { adminClient } from 'better-auth/client/plugins'

export default defineClientAuth({
    plugins: [adminClient()], // harus sama dengan plugin di server
})