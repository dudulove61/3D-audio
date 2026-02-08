/**
 * Cyber DJ - 核心逻辑
 */

// --- 1. 场景初始化 ---
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制像素比以优化性能
document.body.appendChild(renderer.domElement);

camera.position.z = window.innerWidth < 768 ? 400 : 280;
camera.position.y = 50;

var orbit = new THREE.OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;

// --- 2. 粒子球体构建 ---
var radius = 100;
var isMobile = window.innerWidth < 768;
var nbPoints = isMobile ? 2000 : 4000; // 移动端减半粒子数提升帧率

var geometry = new THREE.BufferGeometry();
var positions = new Float32Array(nbPoints * 3);
var initialPositions = new Float32Array(nbPoints * 3);
var colors = new Float32Array(nbPoints * 3);

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
}

geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));

var particleMaterial = new THREE.PointsMaterial({
    size: isMobile ? 6 : 4,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: THREE.VertexColors
});

var particleSystem = new THREE.Points(geometry, particleMaterial);
scene.add(particleSystem);

// --- 3. 音频逻辑 ---
var analyser, frequencyData;
var audioEl = document.getElementById('audio');
var playBtn = document.getElementById('play');
var nextBtn = document.getElementById('next-btn');
var infoEl = document.getElementById('info');
var audioContainer = document.getElementById('audio-container');
var tempColor = new THREE.Color(); // 复用 Color 对象优化内存

function fetchAndPlay() {
    infoEl.innerText = "正在链接赛博空间...";
    audioEl.src = "https://music-api.uke.cc/?t=" + Date.now();
    audioEl.load();
    
    audioEl.addEventListener('loadstart', function() {
        setTimeout(function() {
            try {
                var currentSrc = audioEl.currentSrc || audioEl.src;
                var fileName = decodeURIComponent(currentSrc.split('/').pop().split('?')[0]);
                var cleanName = fileName.replace(/\.[^/.]+$/, ""); 
                if (cleanName && !cleanName.includes("music-api")) {
                    infoEl.innerText = "NOW PLAYING: " + cleanName;
                }
            } catch(e) {}
        }, 800);
    }, { once: true });

    audioEl.play().catch(function(){ infoEl.innerText = "点击下方按钮切歌"; });
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

// --- 4. 渲染循环 ---
function render() {
    requestAnimationFrame(render);
    
    if (frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
        var posAttr = geometry.attributes.position;
        var colAttr = geometry.attributes.color;

        for (var i = 0; i < nbPoints; i++) {
            var index = i % frequencyData.length;
            // 增强低音跳动感：低频部分 factor 更大
            var rawData = frequencyData[index];
            var factor = (rawData / 255) * (index < 10 ? 3.5 : 2.0) + 1.0;

            posAttr.array[i * 3] = initialPositions[i * 3] * factor;
            posAttr.array[i * 3 + 1] = initialPositions[i * 3 + 1] * factor;
            posAttr.array[i * 3 + 2] = initialPositions[i * 3 + 2] * factor;

            // 颜色随频率映射
            var hue = (index / frequencyData.length) + (rawData / 512);
            tempColor.setHSL(hue % 1, 0.8, 0.6);
            colAttr.array[i * 3] = tempColor.r;
            colAttr.array[i * 3 + 1] = tempColor.g;
            colAttr.array[i * 3 + 2] = tempColor.b;
        }
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
    }
    
    particleSystem.rotation.y += 0.002;
    orbit.update();
    renderer.render(scene, camera);
}
render();

// 窗口适配
window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.z = window.innerWidth < 768 ? 400 : 280;
});
