const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 280;
camera.position.y = 80;

const orbit = new THREE.OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true; 

/* 1. 材质升级：开启顶点颜色 */
const particleMaterial = new THREE.PointsMaterial({
    size: 5,
    map: new THREE.TextureLoader().load('res/particle.png'),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    vertexColors: true // 允许粒子变色
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
    // 初始化每个粒子的颜色
    particles.colors.push(new THREE.Color(0x00f2fe)); 
}

const particleSystem = new THREE.Points(particles, particleMaterial);
scene.add(particleSystem);

/* 音频逻辑 */
let analyser, frequencyData;
const audioEl = document.getElementById('audio');
const playBtn = document.getElementById('play');

function fetchNewTrack() {
    // 确保 Vercel 代理已配置
    audioEl.src = '/api/dj-stream?t=' + Date.now();
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
    audioEl.play();
    playBtn.style.display = 'none';
    audioEl.style.display = 'block';
});

audioEl.onended = () => { fetchNewTrack(); audioEl.play(); };

/* 2. 渲染逻辑：动态幻彩跳动 */
function render() {
    requestAnimationFrame(render);
    if (frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
        for (let i = 0; i < particles.vertices.length; i++) {
            let p = particles.vertices[i];
            const index = i % frequencyData.length;
            const amp = frequencyData[index];
            
            // 灵敏度增强
            const factor = (amp / 255) * 2.2 + 1;
            p.x = p.initX * factor;
            p.y = p.initY * factor;
            p.z = p.initZ * factor;

            // 变色逻辑：根据频率切换色相 (HSL)
            let hue = (index / frequencyData.length) + (amp / 512);
            particles.colors[i].setHSL(hue % 1, 0.7, 0.6); 
        }
        particleSystem.geometry.verticesNeedUpdate = true;
        particleSystem.geometry.colorsNeedUpdate = true;
    }
    // 双轴旋转，更具空间感
    particleSystem.rotation.y += 0.003;
    particleSystem.rotation.x += 0.001;
    orbit.update();
    renderer.render(scene, camera);
}
render();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
