/**
 * Cyber DJ - 核心 3D 逻辑 (适配 DuckDuckGo & iOS)
 */

// 1. iOS 环境强制适配
function setupEnvironment() {
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    var audioEl = document.getElementById('audio');
    
    if (isIOS) {
        document.body.classList.add('is-ios');
        // 彻底移除原生控件，防止音量条出现
        audioEl.removeAttribute('controls');
        console.log("iOS 环境：原生控件已移除");
    }
}

// 确保在音频对象存在后运行
window.addEventListener('DOMContentLoaded', setupEnvironment);

// --- 2. 基础场景设置 (保持原样) ---
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
document.body.appendChild(renderer.domElement);

camera.position.z = window.innerWidth < 768 ? 420 : 300;
camera.position.y = 40;

var orbit = new THREE.OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;

// --- 3. 粒子球体构建 (保持原样) ---
var radius = 100;
var isMobile = window.innerWidth < 768;
var nbPoints = isMobile ? 2500 : 4500; 

var geometry = new THREE.BufferGeometry();
var positions = new Float32Array(nbPoints * 3);
var initialPositions = new Float32Array(nbPoints * 3);
var colors = new Float32Array(nbPoints * 3);

var step = 2 / nbPoints;
for (var i = 0; i < nbPoints; i++) {
    var t = i * step - 1;
    var phi = Math.acos(t);
    var theta = (125 * phi) % (2 * Math.PI); 
    var x = Math.cos(theta) * Math.sin(phi) * radius;
    var y = Math.cos(phi) * radius;
    var z = Math.sin(theta) * Math.sin(phi) * radius;
    positions[i * 3] = initialPositions[i * 3] = x;
    positions[i * 3 + 1] = initialPositions[i * 3 + 1] = y;
    positions[i * 3 + 2] = initialPositions[i * 3 + 2] = z;
}
geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));

var textureLoader = new THREE.TextureLoader();
var particleTexture = textureLoader.load('res/particle.png');
var particleMaterial = new THREE.PointsMaterial({
    size: isMobile ? 8 : 6, 
    map: particleTexture,
    blending: THREE.AdditiveBlending, 
    transparent: true,
    depthWrite: false,
    vertexColors: THREE.VertexColors,
    opacity: 0.9
});
var particleSystem = new THREE.Points(geometry, particleMaterial);
scene.add(particleSystem);

// --- 4. 音频逻辑与切歌 (保持原样) ---
var analyser, frequencyData;
var audioEl = document.getElementById('audio');
var playBtn = document.getElementById('play');
var nextBtn = document.getElementById('next-btn');
var infoEl = document.getElementById('info');
var audioContainer = document.getElementById('audio-container');
var tempColor = new THREE.Color(); 

function fetchAndPlay() {
    infoEl.innerText = "正在同步时空音频...";
    audioEl.crossOrigin = "anonymous";
    audioEl.src = "https://music-api.uke.cc/?t=" + Date.now();
    audioEl.load();
    audioEl.play().catch(function(err){ console.log("等待交互..."); });
}

playBtn.addEventListener('click', function() {
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (!analyser) {
        analyser = audioCtx.createAnalyser();
        var source = audioCtx.createMediaElementSource(audioEl);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyser.fftSize = 512;
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
    }
    fetchAndPlay();
    playBtn.style.display = 'none';
    audioContainer.style.display = 'flex';
});

nextBtn.addEventListener('click', fetchAndPlay);
audioEl.onended = fetchAndPlay;

// --- 5. 渲染循环 (保持原样) ---
function render() {
    requestAnimationFrame(render);
    if (frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
        var posAttr = geometry.attributes.position;
        var colAttr = geometry.attributes.color;
        for (var i = 0; i < nbPoints; i++) {
            var index = i % frequencyData.length;
            var factor = (frequencyData[index] / 255) * (index < 20 ? 3.0 : 1.8) + 1.0;
            posAttr.array[i * 3] = initialPositions[i * 3] * factor;
            posAttr.array[i * 3 + 1] = initialPositions[i * 3 + 1] * factor;
            posAttr.array[i * 3 + 2] = initialPositions[i * 3 + 2] * factor;
            var hue = (index / frequencyData.length) + (frequencyData[index] / 512);
            tempColor.setHSL(hue % 1, 0.7, 0.6);
            colAttr.array[i * 3] = tempColor.r;
            colAttr.array[i * 3 + 1] = tempColor.g;
            colAttr.array[i * 3 + 2] = tempColor.b;
        }
        posAttr.needsUpdate = true; colAttr.needsUpdate = true;
    }
    particleSystem.rotation.y += 0.003;
    orbit.update();
    renderer.render(scene, camera);
}
render();

window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
