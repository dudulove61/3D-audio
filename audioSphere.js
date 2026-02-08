const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 270;
camera.position.y = 100;

const orbit = new THREE.OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true; 

// 粒子材质
const particleMaterial = new THREE.PointsMaterial({
    color: 0x00f2fe,
    size: 4,
    map: new THREE.TextureLoader().load('res/particle.png'),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
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
}

const particleSystem = new THREE.Points(particles, particleMaterial);
scene.add(particleSystem);

let analyser, frequencyData;
const audioEl = document.getElementById('audio');
const playBtn = document.getElementById('play');

// 使用 Vercel 代理路径
function fetchNewTrack() {
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

function render() {
    requestAnimationFrame(render);
    if (frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
        for (let i = 0; i < particles.vertices.length; i++) {
            let p = particles.vertices[i];
            const index = i % frequencyData.length;
            // 调整灵敏度：1.8 是放大倍数，你可以根据喜好调整
            const factor = (frequencyData[index] / 255) * 1.8 + 1;
            p.x = p.initX * factor;
            p.y = p.initY * factor;
            p.z = p.initZ * factor;
        }
        particleSystem.geometry.verticesNeedUpdate = true;
    }
    particleSystem.rotation.y += 0.002;
    orbit.update();
    renderer.render(scene, camera);
}
render();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
