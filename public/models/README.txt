把 Blender 导出的模型放在这个目录里，文件名用 model.glb。

导出（Blender）：
  File → Export → glTF 2.0
    Format: glTF Binary (.glb)
    Include → Textures: 勾上（贴图打进文件）
    Transform: +Y Up
    建议勾上 Apply Modifiers
  贴图建议 1K/2K，整体控制在 5MB 以内。

注意：
  · 浏览器跑不了 .blend，必须是 .glb / .gltf
  · Noise / Voronoi 这类程序化节点材质 glTF 不支持，导出会变素色，
    需要先烘焙（Bake → Base Color / Normal / Roughness）成贴图

放好之后刷新页面即可：会自动加载、自动缩放居中、自动落地投影，不用改代码。
如果没有这个文件，页面显示内置的「金属 / 陶瓷 / 玻璃」材质三件套作为占位。
