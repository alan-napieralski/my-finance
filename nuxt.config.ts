export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    '@nuxt/ui'
  ],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  ui: {
    theme: {
      // add new colours here
      colors: [
        'primary',
        'secondary',
        'info',
        'success',
        'warning',
        'error'
      ]
    }
  },

  routeRules: {
    '/': { prerender: true }
  },
  compatibilityDate: '2025-01-15',
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
