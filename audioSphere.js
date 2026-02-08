/**
 * audioSphere.js - 3D 音乐可视化核心逻辑
 * 适配 Cloudflare R2 存储与跨域环境
 */

// --- 1. 初始化 Three.js 场景 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

camera.position.z = 280;
camera.position.y = 80;

// 轨道控制 (确保文件名匹配 libs/OrbitControls.js)
const orbit = new THREE.OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;

// --- 2. R2 配置与音频设置 ---
// 替换为你的 R2 公开 URL 或自定义域名
const R2_BASE_URL = "https://your-r2-public-url.com/"; 
const playlist = ["music1.mp3", "music2.mp3"]; // 填入你 R2 桶里的文件名

const audioEl = document.getElementById('audio');
const playBtn = document.getElementById('play');
const audioContainer = document.getElementById('audio-container');

let analyser, frequencyData;

// 获取 R2 音频
function fetchNewTrack() {
    const randomTrack = playlist[Math.floor(Math.random() * playlist.length)];
    // 关键：必须设置 crossorigin，否则 analyser 拿不到数据
    audioEl.crossOrigin = "anonymous"; 
    audioEl.src = R2_BASE_URL + randomTrack + "?t=" + Date.now();
    audioEl.load();
}

// --- 3. 粒子球体构建 ---
const particleMaterial = new THREE.PointsMaterial({
    size: 5,
    map: new THREE.TextureLoader().load('res/particle.png'),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    vertexColors: true 
});

// 使用兼容性写法创建粒子
const particles = new THREE.Geometry(); 
const radius = 100;
const nbPoints = 4000;
const step = 2 / nbPoints;

for (let i = -1; i <= 1; i += step) {
    const phi = Math.acos(i);
    const theta = (120 * phi) % (2 * Math.PI);
    const particle = new THREE.Vector3();
    
    particle.x = particle.initX = Math.cos(theta) * Math.sin(phi) * radius;
    particle.z = particle.initZ = Math.sin(theta) * Math.sin(phi) * radius;
    particle.y = particle.initY = Math.cos(phi) * radius;
    
    particles.vertices.push(particle);
    particles.colors.push(new THREE.Color(0x00f2fe)); 
}

const particleSystem = new THREE.Points(particles, particleMaterial);
scene.add(particleSystem);

// --- 4. 交互逻辑 ---
playBtn.addEventListener('click', () => {
    // 现代浏览器要求 AudioContext 必须在点击事件内创建
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    if (!analyser) {
        analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaElementSource(audioEl);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyser.fftSize = 1024;
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
    }
    
    fetchNewTrack();
    
    audioEl.play().then(() => {
        playBtn.style.display = 'none';
        if(audioContainer) audioContainer.style.display = 'flex';
    }).catch(err => {
        console.error("播放失败，请检查 R2 CORS 设置:", err);
    });
});

audioEl.onended = () => { fetchNewTrack(); audioEl.play(); };

// --- 5. 渲染循环 ---
function render() {
    requestAnimationFrame(render);
    
    if (frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
        
        // 粒子随节奏震荡
        for (let i = 0; i < particles.vertices.length; i++) {
            let p = particles.vertices[i];
            const index = i % frequencyData.length;
            
            // 节奏振幅：根据频率数据调整缩放系数
            const factor = (frequencyData[index] / 255) * 2.5 + 1;
            
            p.x = p.initX * factor;
            p.y = p.initY * factor;
            p.z = p.initZ * factor;
            
            // 颜色随频率变化
            let hue = (index / frequencyData.length) + (frequencyData[index] / 512);
            particles.colors[i].setHSL(hue % 1, 0.8, 0.6); 
        }
        
        // 告诉 Three.js 顶点和颜色已更新
        particles.verticesNeedUpdate = true;
        particles.colorsNeedUpdate = true;
    }
    
    // 基础旋转
    particleSystem.rotation.y += 0.003;
    orbit.update();
    renderer.render(scene, camera);
}

render();

// --- 6. 适配窗口大小 ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
