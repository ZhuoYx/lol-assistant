import { createRouter, createMemoryHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '首页', icon: 'home' },
  },
  {
    path: '/match-history',
    name: 'MatchHistory',
    component: () => import('@/views/MatchHistory.vue'),
    meta: { title: '战绩', icon: 'match' },
  },
  {
    path: '/rank',
    name: 'Rank',
    component: () => import('@/views/Rank.vue'),
    meta: { title: '排位', icon: 'rank' },
  },
  {
    path: '/champion-stats',
    name: 'ChampionStats',
    component: () => import('@/views/ChampionStats.vue'),
    meta: { title: '英雄', icon: 'champion' },
  },
  {
    path: '/live-game',
    name: 'LiveGame',
    component: () => import('@/views/LiveGame.vue'),
    meta: { title: '对局分析', icon: 'live' },
  },
  {
    path: '/draft-assistant',
    name: 'DraftAssistant',
    component: () => import('@/views/DraftAssistant.vue'),
    meta: { title: '选人助手', icon: 'draft' },
  },
  {
    path: '/rune-builder',
    name: 'RuneBuilder',
    component: () => import('@/views/RuneBuilder.vue'),
    meta: { title: '符文出装', icon: 'rune' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '设置', icon: 'settings' },
  },
  {
    path: '/welcome',
    name: 'Welcome',
    component: () => import('@/views/Welcome.vue'),
    meta: { title: '欢迎', hideInMenu: true },
  },
];

const router = createRouter({
  history: createMemoryHistory(),
  routes,
});

export default router;
export { routes };
