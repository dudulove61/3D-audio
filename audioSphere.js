const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.z = 270;
camera.position.y = 100;

// 控制器设置
const orbit = new THREE.OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true; 

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

// 核心修正：配合 vercel.json 使用代理路径解决跨域拦截
function fetchNewTrack() {
    // 这里的 /api/dj-stream 必须与 vercel.json 中的 source 一致
    const apiUrl = '/api/dj-stream?t=' + Date.now();
    audioEl.src = apiUrl;
    audioEl.load();
}

playBtn.addEventListener('click', () => {
    // 启动 AudioContext
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // 如果还没创建分析器，则初始化
    if (!analyser) {
        analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaElementSource(audioEl);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyser.fftSize = 1024; // 调整 fftSize 提高跳动灵敏度
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
    }

    fetchNewTrack();
    
    // 尝试播放（处理浏览器异步策略）
    const playPromise = audioEl.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.error("播放失败，请检查网络或 API 状态:", error);
        });
    }

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
            
            // 将 4000 个点映射到 512 个频谱数据点上
            const index = i % frequencyData.length; 
            const amplitude = frequencyData[index];
            
            // 计算缩放系数，这里的 1.5 和 1 是可以调节的灵敏度参数
            const factor = (amplitude / 255) * 1.5 + 1;
            
            particle.x = particle.initX * factor;
            particle.y = particle.initY * factor;
            particle.z = particle.initZ * factor;
        }
        particleSystem.geometry.verticesNeedUpdate = true;
    }
    
    particleSystem.rotation.y += 0.002; // 球体缓慢自转
    orbit.update();
    renderer.render(scene, camera);
}
render();

// 窗口大小适配
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
