/**
 * Cyber DJ - audioSphere.js
 * 适配 Three.js R99 版本，支持歌名解析与切歌
 */

// --- 1. 变量配置 ---
var RANDOM_API = "https://music-api.uke.cc/"; // 你的 Worker 地址
var nbPoints = 4000; // 粒子数量
var scene, camera, renderer, orbit, geometry, particleSystem;
var analyser, frequencyData, initialPositions;

var audioEl = document.getElementById('audio');
var playBtn = document.getElementById('play');
var nextBtn = document.getElementById('next-btn');
var trackNameEl = document.getElementById('track-name');
var audioContainer = document.getElementById('audio-container');

// --- 2. 初始化 3D 场景 ---
function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 80, 280);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    orbit = new THREE.OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;

    createParticles();
    render();
}

// --- 3. 创建粒子球 (R99 兼容写法) ---
function createParticles() {
    var radius = 100;
    var positions = new Float32Array(nbPoints * 3);
    initialPositions = new Float32Array(nbPoints * 3);
    var colors = new Float32Array(nbPoints * 3);

    geometry = new THREE.BufferGeometry();
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

    // R99 兼容性处理：优先使用 addAttribute
    var posAttr = new THREE.BufferAttribute(positions, 3);
    var colAttr = new THREE.BufferAttribute(colors, 3);
    
    if (geometry.setAttribute) {
        geometry.setAttribute('position', posAttr);
        geometry.setAttribute('color', colAttr);
    } else {
        geometry.addAttribute('position', posAttr);
        geometry.addAttribute('color', colAttr);
    }

    var material = new THREE.PointsMaterial({
        size: 4,
        map: new THREE.TextureLoader().load('res/particle.png'),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        vertexColors: THREE.VertexColors
    });

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
}

// --- 4. 音频处理逻辑 ---
function fetchNewTrack() {
    audioEl.crossOrigin = "anonymous";
    // 强制刷新缓存，否则可能一直播同一首歌
    audioEl.src = RANDOM_API + "?t=" + Date.now(); 
    audioEl.load();

    // 自动解析歌名
    audioEl.onloadedmetadata = function() {
        var fileName = audioEl.src.split('/').pop().split('?')[0];
        trackNameEl.innerText = "正在播： " + decodeURIComponent(fileName);
    };
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
        audioContainer.style.display = 'flex';
    });
});

nextBtn.addEventListener('click', function() {
    nextBtn.innerText = "切歌中...";
    fetchNewTrack();
    audioEl.play().then(function() {
        nextBtn.innerText = "切换下一首";
    });
});

// --- 5. 渲染循环 ---
function render() {
    requestAnimationFrame(render);
    
    if (frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
        // R99 版本兼容性获取属性方式
        var posAttr = geometry.getAttribute ? geometry.getAttribute('position') : geometry.attributes.position;
        var colAttr = geometry.getAttribute ? geometry.getAttribute('color') : geometry.attributes.color;

        for (var i = 0; i < nbPoints; i++) {
            var index = i % frequencyData.length;
            var factor = (frequencyData[index] / 255) * 2.2 + 1;

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

// 窗口大小自适应
window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 启动场景
initScene();
