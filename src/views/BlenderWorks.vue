<template>
  <section class="page-shell">
    <!-- 只留一个大字：blender练习，蓝→白渐变，居中压在 3D 卡片后面 -->
    <span class="blender-word" aria-hidden="true">blender练习</span>

    <!-- three.js 实时 3D 视口 -->
    <div ref="stageEl" class="viewport">
      <canvas ref="canvasEl" class="viewport-canvas"></canvas>
      <span class="viewport-hint">拖拽旋转 · 滚轮缩放</span>
    </div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const stageEl = ref(null);
const canvasEl = ref(null);
let teardown = () => {};

/* 把模型缩放、居中，并让它正好落在接影地面上 */
const GROUND_Y = -1.05;
function fitToView(object, targetSize = 2.6) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxAxis;
  object.scale.setScalar(scale);
  object.position.set(
    -center.x * scale,
    GROUND_Y + (size.y * scale) / 2 - center.y * scale,
    -center.z * scale,
  );
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    const material = child.material;
    if (!material) return;
    const list = Array.isArray(material) ? material : [material];
    list.forEach((entry) => {
      Object.values(entry).forEach((value) => {
        if (value && value.isTexture) value.dispose();
      });
      entry.dispose();
    });
  });
}

onMounted(() => {
  document.body.classList.add('is-blender-body');
  const stage = stageEl.value;
  const canvas = canvasEl.value;
  if (!stage || !canvas) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // r186 起 PCFSoftShadowMap 已移除

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 2.1, 8.4);

  // 室内环境贴图（three 自带，无需外部 HDRI），给金属/玻璃提供真实反射
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3.4, 5.6, 3.8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 3;
  key.shadow.bias = -0.0008;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  // 只接收阴影的地面（不画出来，保持背景干净）
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.ShadowMaterial({ opacity: 0.2 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  scene.add(ground);

  // 占位：材质三件套（金属 / 陶瓷 / 玻璃）。放进 /models/model.glb 后会被自动替换。
  const placeholder = new THREE.Group();
  const chrome = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 64, 64),
    new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.08 }),
  );
  chrome.position.set(-1.75, 0, 0);
  const ceramic = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.42, 0.15, 220, 32),
    new THREE.MeshPhysicalMaterial({ color: 0xe6dbcc, roughness: 0.34, metalness: 0 }),
  );
  ceramic.position.set(0, 0.1, -0.25);
  const glass = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.6, 0),
    new THREE.MeshPhysicalMaterial({
      color: 0x9fc6d8,
      metalness: 0,
      roughness: 0.08,
      transmission: 0.92,
      thickness: 0.9,
      ior: 1.5,
    }),
  );
  glass.position.set(1.75, 0, 0.35);
  [chrome, ceramic, glass].forEach((mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  placeholder.add(chrome, ceramic, glass);
  scene.add(placeholder);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.5;

  // 缩放居中 + 按包围盒自动取景（换成自己的模型时同样适用）
  function frameModel(object, targetSize = 4.6) {
    fitToView(object, targetSize);
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.6);
    controls.target.copy(center);
    const distance = radius * 2.6;
    camera.position.set(center.x + 0.3, center.y + radius * 0.85, center.z + distance);
    controls.minDistance = radius * 1.5;
    controls.maxDistance = radius * 6;
    controls.update();
  }

  // 不缩放模型，只把相机/环绕中心对准给定包围盒（保持 Blender 里的原始尺寸）
  function frameBox(box) {
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.6);
    const distance = radius * 2.4;
    controls.target.copy(center);
    camera.position.set(center.x + distance * 0.22, center.y + radius * 0.5, center.z + distance);
    camera.lookAt(center);
    controls.minDistance = radius * 1.1;
    controls.maxDistance = radius * 14;
    controls.update();
  }

  frameModel(placeholder);

  // 有 /models/model.glb 就用它，没有则保留占位
  let current = placeholder;
  new GLTFLoader().load(
    '/models/model.glb',
    (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (!child.isMesh) return;
        // 室内环境贴图很亮，深色水面(0.009)会被 IBL 顶成灰白 → 压低环境强度
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (material && 'envMapIntensity' in material) material.envMapIntensity = 0.22;
        });
        child.castShadow = true;
        child.receiveShadow = true;
      });
      scene.add(model);

      // 「海洋体积」在 Blender 里是体积材质（渲染成水雾），glTF 没有体积概念，
      // 导出后变成一块巨大的白色实体（没底色 → 纯白），相机常常正好在它内部。
      // 不按名字判断（中文名可能有 Unicode 规范化差异），改用特征：超大 + 纯白 + 无贴图。
      model.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        const box = new THREE.Box3().setFromObject(child);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const material = child.material;
        const isPlainWhite = !material.map && material.color && material.color.getHex() === 0xffffff;
        if (maxDim > 12 && isPlainWhite) child.visible = false;
      });

      // 「主体」包围盒：优先用浮标那个控制器空物体（所有浮标零件都在它下面），
      // 拿不到就退回到"排除超大网格（海面 / 体积方块）"的算法。
      const buoyRoot = model.getObjectByName('Buoy_Controller');
      let subject;
      if (buoyRoot) {
        subject = new THREE.Box3().setFromObject(buoyRoot);
      } else {
        const subjectBox = new THREE.Box3();
        model.traverse((child) => {
          if (!child.isMesh || !child.visible) return;
          const box = new THREE.Box3().setFromObject(child);
          const size = box.getSize(new THREE.Vector3());
          if (Math.max(size.x, size.y, size.z) > 12) return;
          subjectBox.union(box);
        });
        subject = subjectBox.isEmpty() ? new THREE.Box3().setFromObject(model) : subjectBox;
      }

      // 用「主体」（排除海面/体积方块后剩下的浮标）来取景。
      // 导出的 glb 相机朝向不可靠：.blend 里那颗相机带约束，导出的是约束前的朝向，
      // 实测与浮标方向差 57°，浮标根本不进画面。
      frameBox(subject);

      // 场景自带洋面，就不需要那块接影板了
      ground.visible = false;

      scene.remove(placeholder);
      disposeObject(placeholder);
      current = model;
    },
    undefined,
    () => { /* 没有模型文件，静默保留占位 */ },
  );

  const resize = () => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(stage);

  let onScreen = true;
  const io = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; });
  io.observe(stage);

  renderer.setAnimationLoop(() => {
    if (!onScreen) return;
    controls.update();
    renderer.render(scene, camera);
  });

  teardown = () => {
    renderer.setAnimationLoop(null);
    io.disconnect();
    observer.disconnect();
    controls.dispose();
    scene.remove(placeholder);
    disposeObject(placeholder);
    if (current !== placeholder) disposeObject(current);
    ground.geometry.dispose();
    ground.material.dispose();
    envTexture.dispose();
    renderer.dispose();
  };
});

onBeforeUnmount(() => {
  teardown();
  document.body.classList.remove('is-blender-body');
});
</script>

<style scoped>
/* 整屏主色蓝 + 白字（和首页 / CSS Demo 页同一套） */
.page-shell {
  position: relative;
  width: min(1180px, calc(100% - 96px));
  margin: 0 auto;
  padding-block: clamp(48px, 6vw, 84px) 120px;
  color: #fff;
}

/* 只有「blender练习」：纯白字，由南到北（底部透明 → 顶部实白）做透明度渐变。
   走正常流 + 负 margin，让卡片压住它下半部分，重叠比例是确定的。 */
.blender-word {
  position: relative;
  z-index: 0;
  margin: 0 0 -.42em;
  color: #fff;
  font-size: clamp(56px, 12vw, 186px);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -.055em;
  text-align: center;
  white-space: nowrap;
  -webkit-mask-image: linear-gradient(to top, transparent 0%, #000 100%);
  mask-image: linear-gradient(to top, transparent 0%, #000 100%);
  pointer-events: none;
  user-select: none;
}

/* ── three.js 视口：底色比页面稍深一点，让投影有落点 ─────────────── */
.viewport {
  position: relative;
  z-index: 1;
  height: clamp(380px, 62vh, 700px);
  margin-bottom: clamp(48px, 7vw, 92px);
  overflow: hidden;
  border-radius: 20px;
  /* 卡片底要够厚，「blender练习」才真的像在卡片后面（只从卡片上方露出来） */
  background: rgba(4, 12, 34, .9);
  box-shadow: 0 34px 70px -34px rgba(2, 10, 40, .55);
}
.viewport-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.viewport-hint {
  position: absolute;
  left: 20px;
  bottom: 16px;
  color: rgba(255, 255, 255, .5);
  font: 10px "DM Mono", monospace;
  letter-spacing: .14em;
  text-transform: uppercase;
  pointer-events: none;
}

.page-shell { padding-block: clamp(72px, 9vw, 112px) 130px; }
.page-banner { margin-bottom: 52px; }
.page-banner h1 {
  font-size: clamp(42px, 6.8vw, 82px);
  line-height: 1.05;
  letter-spacing: -.075em;
}

/* 这一页整屏是主色蓝：滚动条槽也铺蓝（页脚的通栏白底在 style.css 里统一处理） */
:global(body.is-blender-body) { background: #002be9; }

@media (max-width: 760px) {
  .page-shell { width: calc(100% - 40px); }
  .viewport { height: 58vh; }
}
</style>
