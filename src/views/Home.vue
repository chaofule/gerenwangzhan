<template>
  <div ref="homeRoot" class="home-page">
    <!-- 横向滑动（照视频那套）：外层撑出纵向滚动长度 → 里层 sticky 钉住一屏 → 轨道靠 translateX 横移。
         卡片默认空白，滑动时按滚动进度逐帧换图，看起来像在播放视频。 -->
    <div ref="scrollWrapper" class="h-wrap">
      <div class="h-sticky">
        <div ref="scrollTrack" class="h-track">
          <figure v-for="(card, index) in cards" :key="index" class="h-card">
            <img class="h-card-frame" alt="" draggable="false" />
          </figure>
        </div>
      </div>
    </div>

    <!-- 邮箱放在横滑区之后，回到正常竖排 -->
    <section id="contact" class="contact section-wrap">
      <span class="contact-label">邮件联系</span>
      <a class="contact-link" href="mailto:hello@example.com">HELLO@EXAMPLE.COM →</a>
    </section>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const route = useRoute();
const homeRoot = ref(null);
const scrollWrapper = ref(null);
const scrollTrack = ref(null);

/* ── 帧序列 ─────────────────────────────────────────────────────
   全部卡片共用同一支片子的帧，放在 public/frames/0001.jpg、0002.jpg …（4 位序号，连续）。
   共 480 帧（尼莫点渲染结果，1920×1080 PNG 压成 1280×720 JPEG，整包约 10MB），
   所以不能一次全预载：滚动时只预载当前帧附近的一小段，其余交给浏览器 HTTP 缓存。
   想让卡片像胶片那样各差一帧（而不是所有卡同一帧），把 FRAME_STEP 改成 1。 */
const FRAME_DIR = '/frames';
const FRAME_STEP = 1;
const CARD_COUNT = 5;
const LOOKAHEAD = 10; // 当前帧往后多预载几帧

let frameCount = 480;   // 会被 /frames/manifest.json 覆盖（换序列时重新生成即可）
let framePad = 4;

const cards = Array.from({ length: CARD_COUNT }, (_, i) => ({ i }));
const warmed = new Map();

const frameSrc = (n) => `${FRAME_DIR}/${String(n + 1).padStart(framePad, '0')}.jpg`;

function travelDistance() {
  const track = scrollTrack.value;
  if (!track) return 0;
  return Math.max(0, track.scrollWidth - window.innerWidth);
}

/* 只预载当前帧附近的一小段，避免一上来拉 10MB */
function warmFrames(base) {
  if (warmed.size > 160) {
    warmed.clear();
  }
  for (let offset = -2; offset <= CARD_COUNT * FRAME_STEP + LOOKAHEAD; offset += 1) {
    const index = ((base + offset) % frameCount + frameCount) % frameCount;
    if (warmed.has(index)) continue;
    const img = new Image();
    img.src = frameSrc(index);
    warmed.set(index, img);
  }
}

async function readManifest() {
  try {
    const res = await fetch(`${FRAME_DIR}/manifest.json`, { cache: 'no-cache' });
    if (!res.ok) return;
    const data = await res.json();
    if (data && Number.isFinite(data.count) && data.count > 0) frameCount = data.count;
    if (data && Number.isFinite(data.digits) && data.digits > 0) framePad = data.digits;
  } catch {
    /* 没有 manifest 就用默认的 480 帧 / 4 位序号 */
  }
}

/* 照视频那套：外层高度 = 横向距离 + 一屏，里层 sticky 钉住，
   滚动进度用 ScrollTrigger 的 onUpdate 换算成轨道 translateX + 卡片帧号。 */
function initHorizontalScroll() {
  const wrap = scrollWrapper.value;
  const track = scrollTrack.value;
  const root = homeRoot.value;
  if (!wrap || !track || !root) return () => {};

  // 不判断 prefers-reduced-motion：横滑是滚动驱动的布局，作者源码也没这个判断。
  root.classList.add('is-hscroll');

  const frames = [...track.querySelectorAll('.h-card-frame')];
  let lastBase = -1;

  const applyFrame = (progress) => {
    // 顶部(progress=0)也显示第一帧，不做"空白卡"：滚回顶部画面不会消失
    const base = Math.min(frameCount - 1, Math.max(0, Math.floor(progress * frameCount)));
    if (base === lastBase) return;
    lastBase = base;
    warmFrames(base);
    frames.forEach((img, i) => {
      const index = (base + i * FRAME_STEP) % frameCount;
      const src = frameSrc(index);
      if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    });
  };

  track.classList.add('is-live');
  applyFrame(0);

  const applyHeight = () => {
    wrap.style.height = `${travelDistance() + window.innerHeight}px`;
  };
  applyHeight();

  const context = gsap.context(() => {
    ScrollTrigger.create({
      trigger: wrap,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        gsap.set(track, { x: -self.progress * travelDistance() });
        applyFrame(self.progress);
      },
    });
  }, wrap);

  const onResize = () => {
    applyHeight();
    ScrollTrigger.refresh();
  };
  window.addEventListener('resize', onResize);

  return () => {
    window.removeEventListener('resize', onResize);
    context.revert();
    root.classList.remove('is-hscroll');
    track.classList.remove('is-live');
    wrap.style.height = '';
    gsap.set(track, { clearProps: 'transform' });
  };
}

/* 头部「关于我」指向 /#contact：邮箱已经在竖排区，直接滚过去就行 */
function scrollToContact() {
  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

onMounted(async () => {
  document.body.classList.add('is-home-body');
  await readManifest();

  nextTick(() => {
    cleanUpScroll = initHorizontalScroll();
    if (route.hash) setTimeout(scrollToContact, 260);
  });
});

let cleanUpScroll = () => {};

watch(() => route.hash, (hash) => {
  if (hash) nextTick(scrollToContact);
});

onBeforeUnmount(() => {
  cleanUpScroll();
  document.body.classList.remove('is-home-body');
  warmed.forEach((img) => { img.src = ''; });
  warmed.clear();
});
</script>

<style scoped>
.home-page {
  position: relative;
  /* 首页底色 = 全站主色（首页大标题「可见。」/ 卡片标题那个蓝） */
  background: #002be9;
}
.h-wrap { position: relative; overflow-x: auto; }
.home-page.is-hscroll .h-wrap { overflow: visible; }

/* 横滑区从视口顶端开始：导航栏占着 66px，如果不顶上去，
   开头滚的那 66px 只是在把 sticky 顶到顶部，卡片看起来会整体上移一下。 */
.home-page.is-hscroll {
  margin-top: -66px;
}

.home-page.is-hscroll .h-sticky {
  position: sticky;
  top: 0;
  height: 100svh;
  overflow: hidden;
}

/* 一条横排的卡片画廊：16:9，间距 30px */
.h-track {
  display: flex;
  align-items: center;
  gap: 30px;
  padding: 72px max(48px, calc((100vw - 1180px) / 2));
}
.home-page.is-hscroll .h-track {
  height: 100%;
  padding-block: 0;
}

/* 卡片底色偏深：帧是夜景海面，加载间隙不会闪出白块 */
.h-card {
  position: relative;
  flex: 0 0 auto;
  /* 一张卡大约占视口宽的 2/3（1440 屏下约 920×518） */
  width: min(64vw, 1000px);
  aspect-ratio: 16 / 9;
  margin: 0;
  overflow: hidden;
  border-radius: 14px;
  background: #0b1220;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .6),
    inset 0 -1px 0 rgba(0, 0, 0, .35),
    0 5px 0 -1px rgba(12, 18, 34, .4),
    0 12px 22px -8px rgba(8, 14, 28, .32),
    0 30px 52px -22px rgba(6, 12, 24, .45);
}
.h-card-frame {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity .16s linear;
}
.h-track.is-live .h-card-frame { opacity: 1; }

/* ── 胶片感：帧的南北两侧压一条深色片基 + 齿孔 ──────────────────
   齿孔用 SVG 平铺（圆角矩形），叠在画面上下边缘上。 */
.h-card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='17'%3E%3Crect x='11' y='4.5' width='22' height='8' rx='2.6' fill='%23f4f2ec' fill-opacity='.9'/%3E%3C/svg%3E"),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='17'%3E%3Crect x='11' y='4.5' width='22' height='8' rx='2.6' fill='%23f4f2ec' fill-opacity='.9'/%3E%3C/svg%3E"),
    linear-gradient(#090c11, #090c11),
    linear-gradient(#090c11, #090c11);
  background-repeat: repeat-x, repeat-x, no-repeat, no-repeat;
  background-position: 0 0, 0 100%, 0 0, 0 100%;
  background-size: 44px 17px, 44px 17px, 100% 17px, 100% 17px;
}

/* 胶片颗粒（叠在最上层） */
.h-card::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 170px 170px;
  mix-blend-mode: soft-light;
  opacity: .38;
}

/* 邮箱区：横滑结束后的正常竖排收尾（底是主色蓝，文字走白） */
.contact {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-block: clamp(72px, 11vh, 132px);
  border-top: 1px solid rgba(255, 255, 255, .28);
}
.contact-label {
  color: rgba(255, 255, 255, .72);
  font-size: 12px;
  letter-spacing: .06em;
}
.contact-link {
  color: #fff;
  font-size: clamp(28px, 4vw, 56px);
  font-weight: 600;
  letter-spacing: -.04em;
  text-decoration: none;
  transition: opacity .25s ease;
}
.contact-link:hover { opacity: .72; }

@media (max-width: 760px) {
  .h-track { padding-inline: 24px; }
  .h-card { width: 82vw; }
  .home-page.is-hscroll { margin-top: -62px; }
}
</style>
