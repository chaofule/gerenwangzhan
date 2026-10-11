<template>
  <section class="page-shell">
    <!-- 大标题压在牌堆后面（装饰性），由南到北黑→白渐变 -->
    <h1 class="page-wordmark" aria-hidden="true">练习</h1>

    <div class="poker-stage">
      <div class="poker-board">
        <div
          v-for="(card, index) in cards"
          :key="index"
          class="poker"
          :class="{ 'is-jumping': card.jump }"
          :style="{ transform: transforms[card.slot], zIndex: card.slot }"
        >
          <img :src="photos[card.image]" alt="" draggable="false" />
        </div>

        <button
          class="poker-top"
          type="button"
          :style="{ transform: transforms[transforms.length - 1] }"
          aria-label="翻开下一张牌"
          @click="advance"
        ></button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';

// 五张牌的扇形位置（参考 poker.html 的 transform_datas）
const transforms = [
  'rotate(-10deg)',
  'rotate(-6deg) translate(35%, -12%)',
  'rotate(-2deg) translate(65%, -19%)',
  'rotate(2deg) translate(95%, -26%)',
  'rotate(6deg) translate(125%, -23%)',
];

const photos = Array.from({ length: 9 }, (_, i) => `/poker/photo-${i}.webp`);
const slots = transforms.length;

// 每张牌记录：扇形位置 slot、当前图片 image、是否瞬移（绕回牌堆底时不做过渡）
const cards = ref(
  Array.from({ length: slots }, (_, i) => ({
    slot: i,
    image: slots - 1 - i,
    jump: false,
  })),
);
const nextImage = ref(slots);

// poker.html 的 init() 会先把 9 张图 new Image() 预载一遍，这里照做，避免翻到新图时闪一下
onMounted(() => {
  document.body.classList.add('is-demo-body');
  photos.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
});

onBeforeUnmount(() => {
  document.body.classList.remove('is-demo-body');
});

// poker.html 的 move()：每张牌往后挪一格，最前面那张瞬移回最左并换新图
function advance() {
  cards.value.forEach((card) => {
    if (card.slot + 1 >= slots) {
      card.slot = 0;
      card.jump = true;
      card.image = nextImage.value;
      nextImage.value = (nextImage.value + 1) % photos.length;
    } else {
      card.slot += 1;
      card.jump = false;
    }
  });
}
</script>
<style scoped>
/* ── 整屏主色蓝: 和首页同一块底色, 牌堆居中, 大标题压在牌堆后面 ──── */
.page-shell {
  position: relative;
  width: 100%;
  margin: 0;
  padding-block: clamp(24px, 5vh, 56px);
  /* 扣掉导航栏占掉的高度, 让底色正好铺满一屏 */
  min-height: calc(100svh - 66px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #002be9;
  /* 让内部的牌堆按页面宽度等比缩放 */
  container-type: inline-size;
}

/* 只有「练习」两个字：由南到北 = 背景同色蓝 → 白 的渐变，压在上方、压在牌堆后面 */
.page-wordmark {
  position: absolute;
  z-index: 0;
  top: 20%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  font-size: clamp(90px, 16vw, 260px);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -.06em;
  white-space: nowrap;
  background-image: linear-gradient(to top, #002be9 0%, #fff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  pointer-events: none;
  user-select: none;
}

.poker-stage {
  position: relative;
  z-index: 1;
  /* 1u 对应参考文件里的 1rem：等价于 * { font-size: 2vmin } 的缩放 */
  --u: clamp(6px, 1.9vmin, 16px);
  display: grid;
  place-items: center;
}
@supports (width: 1cqw) {
  /* 按页面宽度缩放, 同时不超过视口高度的 2/26, 保证整堆牌一屏放得下 */
  .poker-stage { --u: clamp(6px, min(1.6cqw, 2vh), 22px); }
}

/* 牌堆外框：正好包住旋转后的扇形包围盒
   高度取 32.5u：最高的是第 4 张（rotate(2deg) translate(95%,-26%)），
   它的顶边在支点上方约 32.1u；用 29.5u 会溢出，把上面的提示文字压住。 */
.poker-board {
  position: relative;
  width: calc(var(--u) * 52.6);
  height: calc(var(--u) * 32.5);
}

.poker,
.poker-top {
  position: absolute;
  left: calc(var(--u) * 4.5);
  bottom: 0;
  width: calc(var(--u) * 20);
  height: calc(var(--u) * 26);
  overflow: hidden;
  border: calc(var(--u) * .15) solid #fff;
  border-radius: calc(var(--u) * 1.5);
  background: #17f700; /* 图片没加载出来时的兜底底色 */
  transform-origin: bottom left;
  box-shadow: 0 calc(var(--u) * .5) calc(var(--u) * 1.6) rgba(0, 0, 0, .45);
}

/* 交互完全按 poker.html: 只有最上面那张白牌可点, 其余牌不参与交互 */
.poker { transition: transform .3s ease; }
.poker.is-jumping { transition: none; }
.poker img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* poker.html 的 .poker_top: 白牌盖在最上面, 点击翻牌, hover 变灰 */
.poker-top {
  z-index: 1000;
  padding: 0;
  background: #fff;
  cursor: pointer;
  transition: .3s ease;
}
.poker-top:hover { background: #aaa; }
/* 键盘可访问性: 源码没写, 但按钮聚焦时给个可见的焦点圈 */
.poker-top:focus-visible {
  outline: 3px solid #f26b43;
  outline-offset: 3px;
}

@media (max-width: 760px) {
  .page-shell { min-height: calc(100svh - 62px); }
}

/* 这一页整屏是主色蓝：连滚动条槽也铺蓝（页脚的通栏白底在 style.css 里统一处理） */
:global(body.is-demo-body) {
  background: #002be9;
}

/* style.css 里有一条全站规则：系统开启「减弱动态效果」时
   `* { transition-duration: .01ms !important }`。牌堆会因此变成瞬移,
   和作者源码（没有这条限制）的效果对不上, 所以这里把 0.3s 抢回来。
   绕回牌堆底那张仍然要瞬移, 单独压回 0s。 */
@media (prefers-reduced-motion: reduce) {
  .poker { transition-duration: .3s !important; }
  .poker.is-jumping { transition-duration: 0s !important; }
  .poker-top { transition-duration: .3s !important; }
}
</style>
