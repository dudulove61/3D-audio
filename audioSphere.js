// --- 初始化渲染器 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.set(0, 80, 280);

const orbit = new THREE.OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;

// --- 性能监控 (可选) ---
const stats = new Stats();
// document.body.appendChild(stats.domElement); // 如需查看性能请取消注释

// --- 粒子系统配置 ---
const particleMaterial = new THREE.PointsMaterial({
    size: 5,
    map: new THREE.TextureLoader().load('res/particle.png'),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    vertexColors: THREE.VertexColors 
});

const particles = new THREE.Geometry();
const radius = 100;
const nbPoints = 4000;
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

// --- 音频处理逻辑 ---
let analyser, frequencyData, audioCtx;
const audioEl = document.getElementById('audio');
const playBtn = document.getElementById('play');
const audioContainer = document.getElementById('audio-container');

// 这里替换为你 R2 的链接
const R2_URL = "https://pub-your-id.r2.dev/music.mp3"; 

function initAudioSource() {
    // 关键：对于 R2 直连，必须设置 crossOrigin 以允许 AnalyserNode 读取数据
    audioEl.crossOrigin = "anonymous"; 
    audioEl.src = R2_URL;
    audioEl.load();
}

playBtn.addEventListener('click', async function() {
    // 1. 兼容性初始化 AudioContext
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // 2. 强制恢复上下文（解决手机端点击后不跳的问题）
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }

    // 3. 建立节点连接
    if (!analyser) {
        analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaElementSource(audioEl);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyser.fftSize = 1024;
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
    }

    initAudioSource();

    // 4. 执行播放
    audioEl.play().then(() => {
        playBtn.style.display = 'none';
        if(audioContainer) audioContainer.style.display = 'flex'; 
    }).catch(err => {
        console.error("Audio Playback Failed:", err);
        alert("请确保手机未处于静音模式并再次尝试");
    });
});

// --- 渲染循环 ---
function render() {
    requestAnimationFrame(render);
    stats.begin();

    if (frequencyData && !audioEl.paused) {
        analyser.getByteFrequencyData(frequencyData);
        
        const vertices = particles.vertices;
        const colors = particles.colors;

        for (let i = 0; i < vertices.length; i++) {
            const p = vertices[i];
            const index = i % frequencyData.length;
            
            // 计算跳动幅度 (0.0 ~ 1.0)
            const amplitude = frequencyData[index] / 255;
            const factor = amplitude * 2.2 + 1;

            p.x = p.initX * factor;
            p.y = p.initY * factor;
            p.z = p.initZ * factor;

            // 颜色变化：基于频谱位置和当前强度
            const hue = (index / frequencyData.length) + (amplitude * 0.2);
            colors[i].setHSL(hue % 1, 0.7, 0.6); 
        }
        
        // 告知 Three.js 顶点和颜色已更新
        particleSystem.geometry.verticesNeedUpdate = true;
        particleSystem.geometry.colorsNeedUpdate = true;
    }

    // 基础旋转
    particleSystem.rotation.y += 0.003;
    
    orbit.update();
    renderer.render(scene, camera);
    stats.end();
}

render();

// --- 窗口适配 ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
