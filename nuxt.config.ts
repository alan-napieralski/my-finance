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
  runtimeConfig: {
    apiKey: '',
    databaseUrl: '',
    public: {
      apiBase: ''
    }
  },

  routeRules: {
    '/': { prerender: true }
  },
  vite: {
    server: {
      allowedHosts: ['host.docker.internal']
    }
  },
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
