<template>
  <section class="page-shell">
    <div
      ref="stage"
      class="slider-stage"
      :class="{ 'is-dragging': isDragging }"
      aria-label="可拖动的 AE 作品墙"
      @pointerdown="startDrag"
    >
      <div class="slider-canvas" :class="{ 'is-ready': cardsReady }">
        <button
          v-for="(card, index) in cards"
          :key="card"
          :ref="(element) => setCardRef(element, index)"
          class="reel-card"
          type="button"
          :aria-label="`播放：${clips[index % clips.length].title}`"
          @click="playClip(index)"
        >
          <img :src="clips[index % clips.length].cover" alt="" draggable="false" />
          <span class="reel-card-overlay">
            <span class="reel-card-title">{{ clips[index % clips.length].title }}</span>
          </span>
        </button>
      </div>
    </div>

    <div
      v-if="activeClip"
      class="player-backdrop"
      role="presentation"
      @click.self="closePlayer"
    >
      <section class="player-dialog" role="dialog" aria-modal="true" :aria-label="activeClip.title">
        <div class="player-heading">
          <div>
            <span>VIDEO</span>
            <h2>{{ activeClip.title }}</h2>
          </div>
          <div class="player-actions">
            <a
              class="player-external"
              :href="`https://www.bilibili.com/video/${activeClip.bvid}/`"
              target="_blank"
              rel="noopener noreferrer"
            >在 B 站打开 ↗</a>
            <button class="player-close" type="button" aria-label="关闭播放器" @click="closePlayer">×</button>
          </div>
        </div>
        <div class="player-frame">
          <iframe
            :src="activeClip.src"
            :title="activeClip.title"
            allow="fullscreen; picture-in-picture"
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { gsap } from 'gsap';
import cover01 from '../assets/video-covers/video-01.jpg';
import cover02 from '../assets/video-covers/video-02.jpg';
import cover03 from '../assets/video-covers/video-03.jpg';
import cover04 from '../assets/video-covers/video-04.jpg';
import cover05 from '../assets/video-covers/video-05.jpg';
import cover06 from '../assets/video-covers/video-06.jpg';

const cards = Array.from({ length: 32 }, (_, index) => index);

const clips = [
  {
    title: '八分二十秒后，我就会死',
    bvid: 'BV1ejx4z2ERj',
    cover: cover01,
  },
  {
    title: 'PV练习/仿：春岚（做不完了）',
    bvid: 'BV1DzbkzoEsf',
    cover: cover02,
  },
  {
    title: 'Blender练习：丁达尔光森林',
    bvid: 'BV1axDMBNEna',
    cover: cover03,
  },
  {
    title: '仿：butterfly 🦋',
    bvid: 'BV1yzUKYnEJS',
    cover: cover04,
  },
  {
    title: '当世最强的含金量',
    bvid: 'BV1p3NxzzE7E',
    cover: cover05,
  },
  {
    title: '花海地铁打卡',
    bvid: 'BV1m4E1zTE5H',
    cover: cover06,
  },
].map((clip) => ({
  ...clip,
  src: `https://player.bilibili.com/player.html?bvid=${clip.bvid}&page=1&autoplay=0&danmaku=0`,
}));

const stage = ref(null);
const activeClip = ref(null);
const isDragging = ref(false);
const cardsReady = ref(false);
const cardElements = [];
const cardPositions = [];
let gridWidth = 0;
let gridHeight = 0;
let cardWidth = 0;
let cardHeight = 0;
let wrapLeft = 0;
let wrapRight = 0;
let wrapTop = 0;
let wrapBottom = 0;
let dragPointerId = null;
let startX = 0;
let startY = 0;
let lastX = 0;
let lastY = 0;
let lastMoveTime = 0;
let movedDuringDrag = false;
let suppressClick = false;
let targetOffsetX = 0;
let targetOffsetY = 0;
let renderedOffsetX = 0;
let renderedOffsetY = 0;
let lastRenderedOffsetX = 0;
let lastRenderedOffsetY = 0;
let velocityX = 0;
let velocityY = 0;
let tickerActive = false;
let resizeObserver;

function setCardRef(element, index) {
  if (element) cardElements[index] = element;
}

function layoutCards() {
  if (!stage.value || cardElements.length !== cards.length || cards.length === 0) return;

  const bounds = stage.value.getBoundingClientRect();
  const columnGap = Math.max(62, Math.min(126, bounds.width * 0.072));
  const rowGap = Math.max(72, Math.min(112, bounds.width * 0.065));
  cardWidth = cardElements[0].offsetWidth;
  cardHeight = cardElements[0].offsetHeight;

  const columnStride = cardWidth + columnGap;
  const rowStride = cardHeight + rowGap;
  const columns = [2, 4, 8, 16].find((option) => {
    if (cards.length % option !== 0) return false;
    const candidateRows = cards.length / option;
    return option * columnStride >= bounds.width + cardWidth
      && candidateRows * rowStride >= bounds.height + cardHeight;
  }) ?? 16;
  const rows = cards.length / columns;
  const wallWidth = columns * columnStride;
  const wallHeight = rows * rowStride;
  const originX = (bounds.width - wallWidth) / 2;
  const originY = (bounds.height - wallHeight) / 2;

  gridWidth = wallWidth;
  gridHeight = wallHeight;
  wrapLeft = originX;
  wrapRight = originX + gridWidth;
  wrapTop = originY;
  wrapBottom = originY + gridHeight;
  targetOffsetX = 0;
  targetOffsetY = 0;
  renderedOffsetX = 0;
  renderedOffsetY = 0;
  lastRenderedOffsetX = 0;
  lastRenderedOffsetY = 0;
  velocityX = 0;
  velocityY = 0;

  cards.forEach((_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = originX + column * columnStride;
    const y = originY + row * rowStride + (column % 2 ? cardHeight / 2 : 0);
    cardPositions[index] = { x, y };
    gsap.set(cardElements[index], { x, y });
  });
  cardsReady.value = true;
}

function startTicker() {
  if (tickerActive) return;
  tickerActive = true;
  gsap.ticker.add(renderMotion);
}

function renderMotion(_time, deltaTime) {
  const elapsed = Math.min(deltaTime, 50);

  if (dragPointerId === null) {
    targetOffsetX += velocityX * elapsed;
    targetOffsetY += velocityY * elapsed;
    const friction = Math.exp(-elapsed / 340);
    velocityX *= friction;
    velocityY *= friction;

    if (Math.abs(velocityX) < 0.015) velocityX = 0;
    if (Math.abs(velocityY) < 0.015) velocityY = 0;
  }

  const follow = 1 - Math.exp(-elapsed / 55);
  renderedOffsetX += (targetOffsetX - renderedOffsetX) * follow;
  renderedOffsetY += (targetOffsetY - renderedOffsetY) * follow;
  const deltaX = renderedOffsetX - lastRenderedOffsetX;
  const deltaY = renderedOffsetY - lastRenderedOffsetY;
  lastRenderedOffsetX = renderedOffsetX;
  lastRenderedOffsetY = renderedOffsetY;

  if (Math.abs(deltaX) > 0.01 || Math.abs(deltaY) > 0.01) {
    cardPositions.forEach((position, index) => {
      position.x += deltaX;
      position.y += deltaY;

      while (position.x >= wrapRight) position.x -= gridWidth;
      while (position.x < wrapLeft) position.x += gridWidth;
      while (position.y >= wrapBottom) position.y -= gridHeight;
      while (position.y < wrapTop) position.y += gridHeight;

      gsap.set(cardElements[index], { x: position.x, y: position.y, zIndex: 10 + index % 8 });
    });
  }

  const settled = Math.abs(targetOffsetX - renderedOffsetX) < 0.08
    && Math.abs(targetOffsetY - renderedOffsetY) < 0.08
    && velocityX === 0
    && velocityY === 0;
  if (dragPointerId === null && settled) {
    tickerActive = false;
    gsap.ticker.remove(renderMotion);
  }
}

function startDrag(event) {
  if (event.button !== 0 && event.pointerType !== 'touch') return;
  if (activeClip.value) return;

  dragPointerId = event.pointerId;
  startX = lastX = event.clientX;
  startY = lastY = event.clientY;
  lastMoveTime = event.timeStamp;
  movedDuringDrag = false;
  suppressClick = false;
  velocityX = 0;
  velocityY = 0;
  isDragging.value = true;
  window.addEventListener('pointermove', moveDrag, { passive: true });
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  startTicker();
}

function moveDrag(event) {
  if (event.pointerId !== dragPointerId) return;
  const deltaX = event.clientX - lastX;
  const deltaY = event.clientY - lastY;
  const elapsed = Math.max(event.timeStamp - lastMoveTime, 1);
  if (!movedDuringDrag && Math.hypot(event.clientX - startX, event.clientY - startY) > 5) {
    movedDuringDrag = true;
  }
  lastX = event.clientX;
  lastY = event.clientY;
  lastMoveTime = event.timeStamp;
  targetOffsetX += deltaX;
  targetOffsetY += deltaY;
  velocityX = Math.max(-2.2, Math.min(2.2, velocityX * 0.65 + (deltaX / elapsed) * 0.35));
  velocityY = Math.max(-2.2, Math.min(2.2, velocityY * 0.65 + (deltaY / elapsed) * 0.35));
}

function endDrag(event) {
  if (event.pointerId !== dragPointerId) return;
  dragPointerId = null;
  isDragging.value = false;
  window.removeEventListener('pointermove', moveDrag);
  window.removeEventListener('pointerup', endDrag);
  window.removeEventListener('pointercancel', endDrag);
  startTicker();

  suppressClick = movedDuringDrag;
  window.setTimeout(() => {
    suppressClick = false;
  }, 80);
}

function playClip(index) {
  if (suppressClick) return;
  activeClip.value = clips[index % clips.length];
  document.body.style.overflow = 'hidden';
}

function closePlayer() {
  activeClip.value = null;
  document.body.style.removeProperty('overflow');
}

function onKeydown(event) {
  if (event.key === 'Escape' && activeClip.value) closePlayer();
}

onMounted(async () => {
  await nextTick();
  layoutCards();
  resizeObserver = new ResizeObserver(layoutCards);
  resizeObserver.observe(stage.value);
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('pointermove', moveDrag);
  window.removeEventListener('pointerup', endDrag);
  window.removeEventListener('pointercancel', endDrag);
  if (tickerActive) gsap.ticker.remove(renderMotion);
  gsap.killTweensOf(cardElements);
  document.body.style.removeProperty('overflow');
});
</script>

<style scoped>
.page-shell {
  position: relative;
  width: 100%;
  height: 100svh;
  min-height: 0;
  margin: 0;
  padding: 0;
}

.slider-stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  /* 和字体同一个蓝（首页大标题「可见。」/ 卡片标题）*/
  background: #002be9;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.slider-canvas {
  position: relative;
  z-index: 1;
  visibility: hidden;
}

.slider-canvas.is-ready {
  visibility: visible;
}

:global(.site-shell.is-ae-page) {
  position: relative;
  width: 100%;
  height: 100svh;
  max-width: none;
  overflow: hidden;
}

:global(.site-shell.is-ae-page .site-header) {
  position: fixed;
  z-index: 30;
  top: 12px;
  left: 50%;
  width: min(1180px, calc(100% - 96px));
  margin: 0;
  transform: translateX(-50%);
  pointer-events: auto;
}

/* 作品页整屏都是花哨拼贴，导航栏只有线条会看不清；
   在页面顶部垫一条很淡的暗色渐变（导航本身仍是纯线条，不加底色） */
:global(.site-shell.is-ae-page::before) {
  content: "";
  position: fixed;
  z-index: 20;
  inset: 0 0 auto 0;
  height: 150px;
  background: linear-gradient(rgba(4, 8, 18, .5), rgba(4, 8, 18, 0));
  pointer-events: none;
}

:global(.site-shell.is-ae-page .site-footer) {
  display: none;
}

.slider-stage.is-dragging {
  cursor: grabbing;
}

.reel-card {
  position: absolute;
  top: 0;
  left: 0;
  width: clamp(150px, 16.25vw, 234px);
  aspect-ratio: 234 / 342;
  overflow: hidden;
  padding: 0;
  border: 0;
  border-radius: 15px;
  background: #f1f1f1;
  /* 全站主色（首页大标题「可见。」那个蓝）*/
  color: #002be9;
  text-align: left;
  cursor: pointer;
  /* 厚实感 = 上沿反光 + 下沿暗边 + 卡的"侧厚度" + 接触阴影 + 环境阴影 + 照片内暗角
     注意: 卡的 transform 被 GSAP 的 ticker 占着(拖动墙要位移), 所以质感只能靠
     阴影和描边做, 不能用 hover 位移。 */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .5),
    inset 0 -1px 0 rgba(0, 0, 0, .45),
    inset 0 0 0 1px rgba(255, 255, 255, .1),
    inset 0 -22px 32px -26px rgba(0, 0, 0, .3),
    0 5px 0 -1px rgba(12, 18, 34, .55),
    0 12px 20px -8px rgba(8, 14, 28, .45),
    0 32px 55px -22px rgba(6, 12, 24, .6);
  /* 悬停描边: 用 outline 而不是 border —— 不占布局、不会挤动图片, 且跟着圆角走。
     平时是透明的, 悬停时 0.3s 缓动淡入圆珠笔蓝。 */
  outline: 2px solid transparent;
  outline-offset: 0;
  transition: box-shadow .35s ease, outline-color .3s ease;
}

/* 悬停: 卡"抬起来"、投影拉长变淡 + 圆珠笔蓝描边淡入 */
.reel-card:hover,
.reel-card:focus-visible {
  outline-color: #1a4ad6;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .7),
    inset 0 -1px 0 rgba(0, 0, 0, .5),
    inset 0 0 0 1px rgba(255, 255, 255, .16),
    inset 0 -22px 32px -26px rgba(0, 0, 0, .28),
    0 9px 0 -1px rgba(12, 18, 34, .5),
    0 22px 32px -10px rgba(8, 14, 28, .48),
    0 52px 80px -28px rgba(6, 12, 24, .66);
}

.reel-card img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  transition: transform .3s cubic-bezier(.22, .61, .36, 1);
}

.reel-card:hover img,
.reel-card:focus-visible img {
  transform: scale(1.06);
}

.reel-card-overlay {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 38px 16px 16px;
  background: linear-gradient(transparent, rgba(18, 18, 18, .78));
  opacity: 0;
  transition: opacity .22s ease;
}

.reel-card:hover .reel-card-overlay,
.reel-card:focus-visible .reel-card-overlay {
  opacity: 1;
}

.reel-card-title {
  font-size: 15px;
  font-weight: 600;
}

.player-backdrop {
  position: fixed;
  z-index: 30;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 16, 18, .82);
}

.player-dialog {
  width: min(960px, 100%);
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, .16);
  border-radius: 14px;
  background: #17191b;
  color: #002be9;
  box-shadow: 0 28px 90px rgba(0, 0, 0, .4);
}

.player-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 2px 2px 15px;
}

.player-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.player-external {
  color: #002be9;
  font-size: 11px;
  text-decoration: none;
  transition: color .2s ease;
}

.player-external:hover,
.player-external:focus-visible {
  color: #fff;
}

.player-heading span {
  color: #002be9;
  font: 8px "DM Mono", monospace;
  letter-spacing: .14em;
}

.player-heading h2 {
  margin: 6px 0 0;
  font-size: 18px;
  font-weight: 500;
}

.player-close {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, .25);
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
}

.player-frame {
  aspect-ratio: 16 / 9;
  background: #090a0b;
}

.player-frame iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

@media (max-width: 760px) {
  .reel-card {
    width: clamp(138px, 38vw, 190px);
  }

  .reel-card-overlay {
    opacity: 1;
    padding: 30px 12px 12px;
  }

  .reel-card-title {
    font-size: 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .reel-card-overlay {
    transition: none;
  }

  /* 悬停放大(0.3s)和描边、阴影抬起都是明确要的缓动, 不能被 style.css 的全站规则
     压成 .01ms; 所以这里把这三处的时长抢回来。 */
  .reel-card img {
    transition-duration: .3s !important;
  }
  .reel-card {
    transition-duration: .35s, .3s !important;
  }
}
</style>
