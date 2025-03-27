import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.ts'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { setAuthStore } from '@/config/axiosConfig.ts'

// Create the app instance
const app = createApp(App)

// Use plugins
app.use(createPinia())

const authStore = useAuthStore()
setAuthStore(authStore)

app.use(vuetify)
app.use(router)

// Mount the app to the DOM
authStore.loadAuthState().then(() => {
  app.mount('#app')
})
