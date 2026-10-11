<template>
  <footer class="site-footer">
    <router-link class="wordmark footer-mark" to="/" aria-label="返回首页">九<span>。</span></router-link>
    <div class="social-links">
      <a href="https://space.bilibili.com/404923074?spm_id_from=333.1007.0.0">B站</a>
      <a href="https://www.douyin.com/jingxuan">抖音</a>
      <a href="https://github.com/chaofule">GitHub</a>
      <a href="#展位">QQ</a>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  width: min(1180px, calc(100% - 96px));
  min-height: 82px;
  margin: 0 auto;
  border-top: 1px solid rgba(34, 35, 31, 0.14);
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #000000;
  font-size: 12px;
  font-family: "Noto Sans SC", sans-serif;
  font-weight: 1000; /* 加粗 */
  font-stretch: 100%;
}
.wordmark {
  font-size: 23px;
  font-weight: 700;
  letter-spacing: -2px;
  color: #22231f;
  text-decoration: none;
}
.wordmark span { color: #f26b43; }
.social-links {
  display: flex;
  gap: 19px;
}
.social-links a {
  color: #22231f;
  text-decoration: none;
}
@media (max-width: 520px) {
  .site-footer {
    width: calc(100% - 36px);
    min-height: 110px;
    flex-wrap: wrap;
    justify-content: space-between;
    padding-block: 18px;
  }
  .site-footer > span {
    order: 3;
    width: 100%;
  }
  .social-links {
    gap: 11px;
  }
}
</style>
