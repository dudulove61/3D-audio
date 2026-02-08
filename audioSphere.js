// --- 初始化场景 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // 开启 Alpha 透明度
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 优化移动端清晰度
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.set(0, 80, 280);

// --- 自适应手机配置 ---
const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
const nbPoints = isMobile ? 2000 : 4000; // 手机端减半，保证流畅度
const radius = isMobile ? 80 : 100;

// --- 轨道控制 ---
const orbit = new THREE.OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.autoRotate = true; 
orbit.autoRotateSpeed = 0.5;

// --- 粒子系统创建 ---
const particleMaterial = new THREE.PointsMaterial({
    size: isMobile ? 3 : 5, // 手机端粒子稍小更精致
    map: new THREE.TextureLoader().load('res/particle.png'),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    vertexColors: THREE.VertexColors 
});

const particles = new THREE.Geometry();
const step = 2 / nbPoints;

for (let i = -1; i <= 1; i += step) {
    const phi = Math.acos(i);
    const theta = (120 * phi) % (2 * Math.PI);
    const particle = new THREE.Vector3();
    particle.x = particle.initX = Math.cos(theta) * Math.sin(phi) * radius;
    particle.y = particle.initY = Math.cos(phi) * radius;
    particle.z = particle.initZ = Math.sin(theta) * Math.sin(phi) * radius;
    particles.vertices.push(particle);
    particles.colors.push(new THREE.Color(0x00f2fe)); 
}

const particleSystem = new THREE.Points(particles, particleMaterial);
scene.add(particleSystem);

// --- 音频核心逻辑 ---
let analyser, frequencyData, audioCtx;
const audioEl = document.getElementById('audio');
const playBtn = document.getElementById('play');

function fetchNewTrack() {
    audioEl.crossOrigin = "anonymous"; // 解决手机端跨域拦截关键
    audioEl.src = '/api/dj-stream?t=' + Date.now();
    audioEl.load();
}

playBtn.addEventListener('click', function() {
    // 1. 初始化 AudioContext (必须由点击事件触发)
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // 2. 手机端必须手动 resume 
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    // 3. 建立关联
    if (!analyser) {
        analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaElementSource(audioEl);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyser.fftSize = 512; // 手机端建议用 512，计算量更小
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
    }

    fetchNewTrack();
    audioEl.play().then(() => {
        playBtn.style.display = 'none';
        document.getElementById('audio-container').style.display = 'flex';
    }).catch(err => alert("请再次尝试点击播放"));
});

// --- 渲染循环 ---
function render() {
    requestAnimationFrame(render);
    
    if (frequencyData && !audioEl.paused) {
        analyser.getByteFrequencyData(frequencyData);
        
        const vertices = particles.vertices;
        const colors = particles.colors;
        const dataLen = frequencyData.length;

        for (let i = 0; i < vertices.length; i++) {
            const p = vertices[i];
            const index = i % dataLen;
            // 振幅算法：让球体随节奏跳动
            const amplitude = frequencyData[index] / 255;
            const factor = amplitude * 1.8 + 1; 

            p.x = p.initX * factor;
            p.y = p.initY * factor;
            p.z = p.initZ * factor;

            // 颜色随节奏变化 (HSL: Hue, Saturation, Lightness)
            const hue = (index / dataLen) + (amplitude * 0.2);
            colors[i].setHSL(hue % 1, 0.8, 0.5 + amplitude * 0.2);
        }
        particles.verticesNeedUpdate = true;
        particles.colorsNeedUpdate = true;
    }

    particleSystem.rotation.y += 0.002;
    orbit.update();
    renderer.render(scene, camera);
}

render();

// --- 窗口自适应 ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
