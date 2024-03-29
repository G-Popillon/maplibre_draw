import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

//iview
import ViewUIPlus from 'view-ui-plus'
import 'view-ui-plus/dist/styles/viewuiplus.css'

const app = createApp(App)
app.use(ViewUIPlus)
app.mount('#app')
