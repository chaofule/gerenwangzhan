<template>
  <header class="site-header">
    <div class="header-content">
      <router-link class="brand-lockup" to="/" aria-label="返回首页">
        <span class="wordmark">九<span>。</span></span>
        <span class="brand-caption">JIUFENZHILIFANG</span>
      </router-link>
      <nav
        ref="mainNav"
        class="main-nav"
        aria-label="主导航"
        @pointerover="moveNavGlass"
        @pointerleave="restNavGlass"
        @focusin="moveNavGlass"
        @focusout="onNavFocusOut"
      >
        <span
          ref="navGlass"
          class="nav-glass"
          :class="{ 'is-visible': navGlassVisible, 'reduced-motion': reducedMotion }"
          aria-hidden="true"
        ></span>
        <router-link to="/" exact>首页</router-link>
        <router-link to="/ae-works">作品</router-link>
        <router-link to="/blender-works">Blender</router-link>
        <router-link to="/css-demo">CSS Demo</router-link>
      </nav>
      <router-link class="availability" to="/#contact">
        <span>关于我</span>
      </router-link>
    </div>
  </header>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { animate } from 'motion';
import { useRoute } from 'vue-router';

const route = useRoute();
const mainNav = ref(null);
const navGlass = ref(null);
const navGlassVisible = ref(false);
const reducedMotion = ref(false);
let glassAnimation;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function placeNavGlass(link, { animated = true } = {}) {
  const glass = navGlass.value;
  if (!glass) return;

  // 没有目标(例如路由不在导航内)时, 收起玻璃片
  if (!link) {
    navGlassVisible.value = false;
    glassAnimation?.stop();
    return;
  }

  const left = link.offsetLeft - 8;
  const top = link.offsetTop + (link.offsetHeight - glass.offsetHeight) / 2;
  const width = link.offsetWidth + 16;
  navGlassVisible.value = true;
  glassAnimation?.stop();

  if (!animated || prefersReducedMotion()) {
    reducedMotion.value = true;
    glass.style.translate = `${left}px ${top}px`;
    glass.style.width = `${width}px`;
    return;
  }

  reducedMotion.value = false;
  glassAnimation = animate(
    glass,
    { x: left, y: top, width },
    { type: 'spring', stiffness: 380, damping: 32 },
  );
}

function activeNavLink() {
  return mainNav.value?.querySelector('a.router-link-exact-active') ?? null;
}

function moveNavGlass(event) {
  placeNavGlass(event.target.closest('a'));
}

// 指针离开后玻璃片回到当前页面, 和苹果导航条一样保留选中态
function restNavGlass() {
  placeNavGlass(activeNavLink());
}

function onNavFocusOut(event) {
  if (!mainNav.value?.contains(event.relatedTarget)) restNavGlass();
}

function syncActiveNav() {
  nextTick(() => placeNavGlass(activeNavLink(), { animated: false }));
}

function onResize() {
  placeNavGlass(activeNavLink(), { animated: false });
}

onMounted(() => {
  syncActiveNav();
  window.addEventListener('resize', onResize);
});

watch(() => route.path, syncActiveNav);

onBeforeUnmount(() => {
  glassAnimation?.stop();
  window.removeEventListener('resize', onResize);
});
</script>

<style scoped>
/* ── 黑白极简线条导航：没有玻璃、没有底色，只剩一圈 1px 描边 + 文字 ────
   --hd-ink / --hd-dim / --hd-line 三个变量按页面底色切换（浅色页=黑线，深色/蓝色页=白线）。 */
.site-header {
  --hd-ink: #16170f;
  --hd-dim: rgba(22, 23, 15, .62);
  --hd-line: rgba(22, 23, 15, .45);
  position: sticky;
  z-index: 15;
  top: 12px;
  width: min(1180px, calc(100% - 96px));
  height: 54px;
  margin: 12px auto 0;
  border: 1px solid var(--hd-line);
  border-radius: 100px;
  background: transparent;
  color: var(--hd-ink);
  transition: border-color .25s ease;
}

.header-content {
  position: relative;
  z-index: 3;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: space-between;
  padding-inline: clamp(24px, 4vw, 58px);
}

.brand-lockup { display: flex; align-items: center; gap: 12px; color: var(--hd-ink); text-decoration: none; }
.wordmark {
  display: inline-block;
  color: var(--hd-ink);
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -3px;
}
.wordmark span { color: var(--hd-ink); }
.brand-caption {
  padding-left: 7px;
  border-left: 1px solid var(--hd-line);
  color: var(--hd-dim);
  font: 12px "Noto Sans Mono", monospace;
  letter-spacing: .15em;
  font-family: "Noto Sans SC", sans-serif;
  font-weight: 1000; /* 加粗 */
  font-stretch: 100%;
}

.main-nav {
  position: relative;
  display: flex;
  gap: clamp(15px, 2.6vw, 34px);
  align-items: center;
  min-height: 34px;
}

/* 选中/悬停：一个 1px 线条的小胶囊 */
.nav-glass {
  position: absolute;
  z-index: 0;
  top: 0;
  left: 0;
  width: 76px;
  height: 34px;
  border: 1px solid var(--hd-line);
  border-radius: 17px;
  background: transparent;
  opacity: 0;
  pointer-events: none;
  transition: opacity .18s ease;
}
.nav-glass.reduced-motion {
  transition:
    opacity .18s ease,
    translate .16s ease-out,
    width .16s ease-out !important;
}
.nav-glass.is-visible { opacity: 1; }

.main-nav a {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 0;
  color: var(--hd-dim);
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
  transition: color .25s ease;
  white-space: nowrap;
}
.main-nav a:hover,
.main-nav a.router-link-exact-active { color: var(--hd-ink); }

.availability {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 15px 7px 13px;
  border: 1px solid var(--hd-line);
  border-radius: 100px;
  background: transparent;
  color: var(--hd-dim);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .02em;
  text-decoration: none;
  transition: color .25s ease, border-color .25s ease;
}
.availability:hover {
  border-color: var(--hd-ink);
  color: var(--hd-ink);
}

/* ── 深色 / 蓝色底页面：线条和文字整体翻白 ─────────────────────────
   AE 作品页(彩色拼贴)、CSS Demo 页(纯黑)、首页与 Blender 页(主色蓝) 都走这套。
   花底图上只有白线会糊掉，所以在白线外面再垫一圈极淡的暗线，两种情况都立得住。
   注意: 整条选择器必须包在 :global() 里，只包前缀会被 Vue 丢掉后代部分。 */
:global(.site-shell:is(.is-ae-page, .is-demo-page, .is-home-page, .is-blender-page) .site-header) {
  --hd-ink: #fff;
  --hd-dim: rgba(255, 255, 255, .8);
  --hd-line: rgba(255, 255, 255, .88);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, .25);
}
:global(.site-shell:is(.is-ae-page, .is-demo-page, .is-home-page, .is-blender-page) .site-header .header-content) {
  text-shadow: 0 1px 4px rgba(0, 0, 0, .5);
}

@media (prefers-reduced-motion: reduce) {
  .site-header { transition: none; }
}

@media (max-width: 760px) {
  .site-header {
    width: calc(100% - 40px);
    height: 50px;
    border-radius: 25px;
  }
  .header-content { padding-inline: 22px; }
  .brand-caption { display: none; }
  .main-nav {
    gap: 12px;
    font-size: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }
}

@media (max-width: 520px) {
  .site-header {
    top: 12px;
    width: calc(100% - 28px);
    height: 50px;
    margin-top: 12px;
    border-radius: 25px;
  }
  .header-content { padding-inline: 16px; }
  .main-nav { gap: 9px; }
  .main-nav a { font-size: 9px; }
  .availability { padding: 0; border-color: transparent; background: none; font-size: 0; }
}
</style>
