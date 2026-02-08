import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue' // ADICIONEI O "-plugin" AQUI
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Meu Acompanhamento Acadêmico',
        short_name: 'Acadêmico',
        description: 'Gerenciador de matérias e presenças',
        theme_color: '#42b883',
        icons: [
          {
            src: 'vite.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ]
})

