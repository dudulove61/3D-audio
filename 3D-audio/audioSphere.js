const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.z = 270;
camera.position.y = 100;

const orbit = new THREE.OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true; // 增加滑动感

/* 粒子系统设置 */
const particles = new THREE.Geometry();
const particleMaterial = new THREE.PointsMaterial({
    color: 0x00f2fe, // 赛博蓝
    size: 4,
    map: new THREE.TextureLoader().load('res/particle.png'),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
});

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
}

const particleSystem = new THREE.Points(particles, particleMaterial);
scene.add(particleSystem);

/* 音频与 API 逻辑 */
let analyser, frequencyData;
const audioEl = document.getElementById('audio');
const playBtn = document.getElementById('play');

function fetchNewTrack() {
    // 使用 HTTPS 尝试连接 API，避免 Vercel 报错
    const apiUrl = 'https://api.yujn.cn/api/dj.php?t=' + Date.now();
    audioEl.src = apiUrl;
    audioEl.load();
}

playBtn.addEventListener('click', () => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaElementSource(audioEl);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 2048; // 调小一点让反应更灵敏
    frequencyData = new Uint8Array(analyser.frequencyBinCount);

    fetchNewTrack();
    audioEl.play();

    playBtn.style.display = 'none';
    audioEl.style.display = 'block';
});

// 播完自动下一首
audioEl.onended = () => {
    fetchNewTrack();
    audioEl.play();
};

function render() {
    requestAnimationFrame(render);
    if (frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
        for (let i = 0; i < particles.vertices.length; i++) {
            let particle = particles.vertices[i];
            // 根据频率缩放粒子位置
            const index = i % 512; 
            const factor = (frequencyData[index] / 255) * 1.2 + 1;
            particle.x = particle.initX * factor;
            particle.y = particle.initY * factor;
            particle.z = particle.initZ * factor;
        }
        particleSystem.geometry.verticesNeedUpdate = true;
    }
    particleSystem.rotation.y += 0.002; // 自动慢转
    orbit.update();
    renderer.render(scene, camera);
}
render();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});