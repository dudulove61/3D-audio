/**
 * Cyber DJ - audioSphere.js
 * 核心逻辑：3D 粒子球可视化 + Cloudflare R2 Worker 随机音频
 */

// --- 1. 基础场景设置 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

camera.position.z = 280;
camera.position.y = 80;

// 控制器 (确保引用路径正确：libs/OrbitControl.js)
const orbit = new THREE.OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true; 

// --- 2. 粒子球体构建 ---
const particleMaterial = new THREE.PointsMaterial({
    size: 5,
    // --- 路径修正：改为 res/particle.png ---
    map: new THREE.TextureLoader().load('res/particle.png'), 
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    vertexColors: true 
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
    particle.z = particle.initZ = Math.sin(theta) * Math.sin(phi) * radius;
    particle.y = particle.initY = Math.cos(phi) * radius;
    particles.vertices.push(particle);
    particles.colors.push(new THREE.Color(0x00f2fe)); 
}

const particleSystem = new THREE.Points(particles, particleMaterial);
scene.add(particleSystem);

// --- 3. 音频与 Worker 联动逻辑 ---
let analyser, frequencyData;
const audioEl = document.getElementById('audio');
const playBtn = document.getElementById('play');
const audioContainer = document.getElementById('audio-container');

// 你的 Worker 域名地址 (已绑定到 Worker)
const RANDOM_API = "https://music-api.uke.cc/";

function fetchNewTrack() {
    audioEl.crossOrigin = "anonymous"; 
    // 每次请求根目录，Worker 会自动扫描 R2 桶并随机返回一个 mp3
    audioEl.src = RANDOM_API + "?t=" + Date.now();
    audioEl.load();
}

playBtn.addEventListener('click', () => {
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
        console.error("播放失败，请检查 Worker 绑定和域名解析:", err);
    });
});

audioEl.onended = () => { 
    fetchNewTrack(); 
    audioEl.play(); 
};

// --- 4. 核心渲染循环 ---
function render() {
    requestAnimationFrame(render);
    
    if (frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
        
        for (let i = 0; i < particles.vertices.length; i++) {
            let p = particles.vertices[i];
            const index = i % frequencyData.length;
            const factor = (frequencyData[index] / 255) * 2.5 + 1;
            p.x = p.initX * factor;
            p.y = p.initY * factor;
            p.z = p.initZ * factor;
            
            let hue = (index / frequencyData.length) + (frequencyData[index] / 512);
            particles.colors[i].setHSL(hue % 1, 0.8, 0.6); 
        }
        
        particle
