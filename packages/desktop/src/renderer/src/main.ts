import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/global.css';
import { useAppStore } from './stores/app';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
const appStore = useAppStore(pinia);
window.electronAPI.getChampionDataSource().then(source => {
  appStore.championDataSource = source;
}).catch(() => {
  // A newly installed app uses OP.GG by default.
}).finally(() => app.mount('#app'));
