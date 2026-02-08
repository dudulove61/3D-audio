/**
 * 3D Audio Sphere - Aurora Glitch Version
 * 功能：幻彩变色、频谱联动、底部感应显示、自动换歌
 */

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 设置相机初始位置
camera.position.z = 280;
camera.position.y = 80;

// 控制器设置
const orbit = new THREE.OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true; 

/* 1. 材质与粒子初始化 */
const particleMaterial = new THREE.PointsMaterial({
    size: 5,
    map: new THREE.TextureLoader().load('res/particle.png'),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    vertexColors: true // 开启顶点颜色，实现幻彩效果
});

const particles = new THREE.Geometry();
const radius = 100;
const nbPoints = 4000;
const step = 2 / nbPoints;

for (let i = -1; i <= 1; i += step) {
    const phi = Math.acos(i);
    const theta = (120 * phi) % (2 * Math.PI);
    const particle = new THREE.Vector3();
    
    // 初始位置计算
    particle.x = particle.initX = Math.cos(theta) * Math.sin(phi) * radius;
    particle.z = particle.initZ = Math.sin(theta) * Math.sin(phi) * radius;
    particle.y = particle.initY = Math.cos(phi) * radius;
    
    particles.vertices.push(particle);
    // 初始化颜色：赛博蓝
    particles.colors.push(new THREE.Color(0x00f2fe)); 
}

const particleSystem = new THREE.Points(particles, particleMaterial);
scene.add(particleSystem);

/* 2. 音频逻辑核心 */
let analyser, frequencyData;
const audioEl = document.getElementById('audio');
const playBtn = document.getElementById('play');
const audioContainer = document.getElementById('audio-container');

// 调用 Vercel 反向代理地址，规避 HTTPS 拦截
function fetchNewTrack() {
    audioEl.src = '/api/dj-stream?t=' + Date.now();
    audioEl.load();
}

// 点击开启交互
playBtn.addEventListener('click', () => {
    // 兼容浏览器的 AudioContext 初始化
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    if (!analyser) {
        analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaElementSource(audioEl);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyser.fftSize = 1024; // 灵敏度设置
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
    }
    
    fetchNewTrack();
    audioEl.play();

    // UI 变换
    playBtn.style.display = 'none';
    audioContainer.style.display = 'flex'; // 激活容器，CSS 会接管“靠近显现”动画
});

// 自动切歌
audioEl.onended = () => {
    fetchNewTrack();
    audioEl.play();
};

/* 3. 渲染循环 */
function render() {
    requestAnimationFrame(render);
    
    if (frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
        
        for (let i = 0; i < particles.vertices.length; i++) {
            let p = particles.vertices[i];
            const index = i % frequencyData.length;
            const amp = frequencyData[index];
            
            // 频谱联动：计算粒子跳动幅度
            // 2.2 是灵敏度系数，可以按需微调
            const factor = (amp / 255) * 2.2 + 1;
            p.x = p.initX * factor;
            p.y = p.initY * factor;
            p.z = p.initZ * factor;

            // 幻彩变色：根据频率动态改变 HSL 色相
            let hue = (index / frequencyData.length) + (amp / 512);
            particles.colors[i].setHSL(hue % 1, 0.7, 0.6); 
        }
        
        // 告知 Three.js 顶点数据和颜色数据已更新
        particleSystem.geometry.verticesNeedUpdate = true;
        particleSystem.geometry.colorsNeedUpdate = true;
    }
    
    // 自动缓速旋转
    particleSystem.rotation.y += 0.003;
    particleSystem.rotation.x += 0.001;
    
    orbit.update();
    renderer.render(scene, camera);
}

render();

// 窗口自适应
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
