/**
 * Cyber DJ - audioSphere.js (BufferGeometry 兼容版)
 */

// --- 1. 基础场景设置 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

camera.position.z = 280;
camera.position.y = 80;

// 控制器
const orbit = new THREE.OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;

// --- 2. 粒子球体构建 (现代 BufferGeometry 写法) ---
const radius = 100;
const nbPoints = 4000;
const positions = new Float32Array(nbPoints * 3);
const initialPositions = new Float32Array(nbPoints * 3);
const colors = new Float32Array(nbPoints * 3);

const geometry = new THREE.BufferGeometry();
const step = 2 / nbPoints;

for (let i = 0; i < nbPoints; i++) {
    const t = i * step - 1;
    const phi = Math.acos(t);
    const theta = (120 * phi) % (2 * Math.PI);

    const x = Math.cos(theta) * Math.sin(phi) * radius;
    const y = Math.cos(phi) * radius;
    const z = Math.sin(theta) * Math.sin(phi) * radius;

    // 填充位置数组
    positions[i * 3] = initialPositions[i * 3] = x;
    positions[i * 3 + 1] = initialPositions[i * 3 + 1] = y;
    positions[i * 3 + 2] = initialPositions[i * 3 + 2] = z;

    // 初始颜色
    const color = new THREE.Color(0x00f2fe);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const particleMaterial = new THREE.PointsMaterial({
    size: 5,
    map: new THREE.TextureLoader().load('res/particle.png'), // 确认路径正确
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    vertexColors: true
});

const particleSystem = new THREE.Points(geometry, particleMaterial);
scene.add(particleSystem);

// --- 3. 音频与 Worker 联动 ---
let analyser, frequencyData;
const audioEl = document.getElementById('audio');
const playBtn = document.getElementById('play');
const audioContainer = document.getElementById('audio-container');
const RANDOM_API = "https://music-api.uke.cc/";

function fetchNewTrack() {
    audioEl.crossOrigin = "anonymous";
    audioEl.src = RANDOM_API + "?t=" + Date.now();
    audioEl.load();
}

playBtn.addEventListener('click', () => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

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
    }).catch(err => console.error("播放失败:", err));
});

audioEl.onended = () => { fetchNewTrack(); audioEl.play(); };

// --- 4. 渲染循环 ---
function render() {
    requestAnimationFrame(render);
    
    if (frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
        const posAttr = geometry.attributes.position;
        const colAttr = geometry.attributes.color;

        for (let i = 0; i < nbPoints; i++) {
            const index = i % frequencyData.length;
            const factor = (frequencyData[index] / 255) * 2.5 + 1;

            // 更新顶点位置
            posAttr.array[i * 3] = initialPositions[i * 3] * factor;
            posAttr.array[i * 3 + 1] = initialPositions[i * 3 + 1] * factor;
            posAttr.array[i * 3 + 2] = initialPositions[i * 3 + 2] * factor;

            // 更新颜色
            let hue = (index / frequencyData.length) + (frequencyData[index] / 512);
            const color = new THREE.Color().setHSL(hue % 1, 0.8, 0.6);
            colAttr.array[i * 3] = color.r;
            colAttr.array[i * 3 + 1] = color.g;
            colAttr.array[i * 3 + 2] = color.b;
        }
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
    }
    
    particleSystem.rotation.y += 0.003;
    orbit.update();
    renderer.render(scene, camera);
}
render();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
