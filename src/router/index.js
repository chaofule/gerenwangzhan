import { createRouter, createWebHistory } from 'vue-router';

import Home from '@/views/Home.vue';
import AeWorks from '@/views/AeWorks.vue';
import BlenderWorks from '@/views/BlenderWorks.vue';
import CssDemo from '@/views/CssDemo.vue';

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/ae-works', name: 'AeWorks', component: AeWorks },
  { path: '/blender-works', name: 'BlenderWorks', component: BlenderWorks },
  { path: '/css-demo', name: 'CssDemo', component: CssDemo },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) {
      return {
        el: to.hash,
        top: 96,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      };
    }
    return { left: 0, top: 0 };
  },
});

export default router;
