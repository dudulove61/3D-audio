/* 1. 材质升级：开启顶点着色 (vertexColors) */
const particleMaterial = new THREE.PointsMaterial({
    size: 5,
    map: new THREE.TextureLoader().load('res/particle.png'),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    vertexColors: true // 允许每个粒子有独立颜色
});

// 在循环创建粒子的地方，给每个粒子初始化一个颜色
for (let i = -1; i <= 1; i += step) {
    // ... 原有的坐标计算代码保持不变 ...
    particles.vertices.push(particle);
    // 新增：初始化颜色（默认白色）
    particles.colors.push(new THREE.Color(0xffffff)); 
}

/* 2. 渲染逻辑升级：动态幻彩 */
function render() {
    requestAnimationFrame(render);
    if (frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
        for (let i = 0; i < particles.vertices.length; i++) {
            let p = particles.vertices[i];
            const index = i % frequencyData.length;
            const amp = frequencyData[index];
            const factor = (amp / 255) * 2.0 + 1; // 增强跳动幅度

            p.x = p.initX * factor;
            p.y = p.initY * factor;
            p.z = p.initZ * factor;

            // 动态变色逻辑：根据频率切换颜色（从青色到紫色）
            let hue = (index / frequencyData.length) + (amp / 255);
            particles.colors[i].setHSL(hue % 1, 0.8, 0.6); 
        }
        particleSystem.geometry.verticesNeedUpdate = true;
        particleSystem.geometry.colorsNeedUpdate = true; // 告知系统颜色已更新
    }
    // 让球体绕 X 和 Y 轴同时旋转，更有空间感
    particleSystem.rotation.y += 0.003;
    particleSystem.rotation.x += 0.001;
    orbit.update();
    renderer.render(scene, camera);
}
