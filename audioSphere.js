/**
 * Cyber DJ - audioSphere.js (通用兼容版)
 */

// --- 1. 基础场景设置 ---
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

camera.position.z = 280;
camera.position.y = 80;

// 控制器 (确保路径正确：libs/OrbitControl.js)
var orbit = new THREE.OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;

// --- 2. 粒子球体构建 (使用 addAttribute 兼容老版本) ---
var radius = 100;
var nbPoints = 4000;
var positions = new Float32Array(nbPoints * 3);
var initialPositions = new Float32Array(nbPoints * 3);
var colors = new Float32Array(nbPoints * 3);

var geometry = new THREE.BufferGeometry();
var step = 2 / nbPoints;

for (var i = 0; i < nbPoints; i++) {
    var t = i * step - 1;
    var phi = Math.acos(t);
    var theta = (120 * phi) % (2 * Math.PI);

    var x = Math.cos(theta) * Math.sin(phi) * radius;
    var y = Math.cos(phi) * radius;
    var z = Math.sin(theta) * Math.sin(phi) * radius;

    positions[i * 3] = initialPositions[i * 3] = x;
    positions[i * 3 + 1] = initialPositions[i * 3 + 1] = y;
    positions[i * 3 + 2] = initialPositions[i * 3 + 2] = z;

    var color = new THREE.Color(0x00f2fe);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
}

// 🚨 关键修正：同时尝试两种方法，确保任何版本都不报错
if (geometry.setAttribute) {
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
} else {
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
}

var particleMaterial = new THREE.PointsMaterial({
    size: 5,
    map: new THREE.TextureLoader().load('res/particle.png'), 
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    vertexColors: THREE.VertexColors // 老版本写法
});

var particleSystem = new THREE.Points(geometry, particleMaterial);
scene.add(particleSystem);

// --- 3. 音频与 Worker 联动 ---
var analyser, frequencyData;
var audioEl = document.getElementById('audio');
var playBtn = document.getElementById('play');
var audioContainer = document.getElementById('audio-container');
var RANDOM_API = "https://music-api.uke.cc/";

function fetchNewTrack() {
    audioEl.crossOrigin = "anonymous";
    audioEl.src = RANDOM_API + "?t=" + Date.now();
    audioEl.load();
}

playBtn.addEventListener('click', function() {
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (!analyser) {
        analyser = audioCtx.createAnalyser();
        var source = audioCtx.createMediaElementSource(audioEl);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyser.fftSize = 1024;
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
    }
    
    fetchNewTrack();
    audioEl.play().then(function() {
        playBtn.style.display = 'none';
        if(audioContainer) audioContainer.style.display = 'flex';
    }).catch(function(err) { console.error("播放失败:", err); });
});

audioEl.onended = function() { fetchNewTrack(); audioEl.play(); };

// --- 4. 渲染循环 ---
function render() {
    requestAnimationFrame(render);
    
    if (frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
        var posAttr = geometry.getAttribute ? geometry.getAttribute('position') : geometry.attributes.position;
        var colAttr = geometry.getAttribute ? geometry.getAttribute('color') : geometry.attributes.color;

        for (var i = 0; i < nbPoints; i++) {
            var index = i % frequencyData.length;
            var factor = (frequencyData[index] / 255) * 2.5 + 1;

            posAttr.array[i * 3] = initialPositions[i * 3] * factor;
            posAttr.array[i * 3 + 1] = initialPositions[i * 3 + 1] * factor;
            posAttr.array[i * 3 + 2] = initialPositions[i * 3 + 2] * factor;

            var hue = (index / frequencyData.length) + (frequencyData[index] / 512);
            var color = new THREE.Color().setHSL(hue % 1, 0.8, 0.6);
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

window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
