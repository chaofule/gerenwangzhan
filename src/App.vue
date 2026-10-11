<template>
  <div
    class="site-shell"
    :class="{
      'is-ae-page': route.path === '/ae-works',
      'is-demo-page': route.path === '/css-demo',
      'is-home-page': route.path === '/',
      'is-blender-page': route.path === '/blender-works',
    }"
  >
    <SiteHeader />
    <main>
      <router-view />
    </main>
    <SiteFooter />
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router';
import SiteHeader from './components/SiteHeader.vue';
import SiteFooter from './components/SiteFooter.vue';

const route = useRoute();
</script>

<style scoped>
.site-shell {
  max-width: 1600px;
  margin: 0 auto;
  overflow: clip;
}
/* CSS Demo / 首页 / Blender 页要整屏铺底, 这几页不限宽 */
.site-shell.is-demo-page,
.site-shell.is-home-page,
.site-shell.is-blender-page {
  max-width: none;
}

/* Blender 页 / CSS Demo 页同样是主色蓝铺满，顶掉导航高度让底色从视口最顶端开始 */
.site-shell:is(.is-blender-page, .is-demo-page) main {
  margin-top: -66px;
  padding-top: 66px;
  background: #002be9;
}
@media (max-width: 760px) {
  .site-shell:is(.is-blender-page, .is-demo-page) main {
    margin-top: -62px;
    padding-top: 62px;
  }
}
main {
  position: relative;
  width: 100%;
}
</style>
