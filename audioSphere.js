/**
 * Cyber DJ - audioSphere.js (最终修复版)
 * 功能：3D粒子律动、R99版本兼容、重定向歌名捕获、切歌功能
 */

// --- 1. 基础配置 ---
var RANDOM_API = "https://music-api.uke.cc/"; 
var nbPoints = 4000; 
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

    // 控制器
    orbit = new THREE.OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;

    createParticles();
    render();
}

// --- 3. 创建粒子球 (适配 R99 addAttribute) ---
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

    // 适配 R99 版本的属性添加方式
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
        map: new THREE.TextureLoader().load('res/particle.png'), // 请确保有此贴图，或改为普通点
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        vertexColors: THREE.VertexColors
    });

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
}

// --- 4. 音乐获取与歌名解析 (修复重定向捕获) ---
function fetchNewTrack() {
    audioEl.crossOrigin = "anonymous";
    // 强制不缓存请求
    var requestUrl = RANDOM_API + "?t=" + Date.now();
    audioEl.src = requestUrl;
    audioEl.load();

    // 核心修复：监听音频开始加载，等待重定向完成后抓取真实地址
    var nameUpdateHandler = function() {
        setTimeout(function() {
            try {
                // currentSrc 是重定向后的最终文件地址
                var currentSrc = audioEl.currentSrc || audioEl.src;
                var urlObj = new URL(currentSrc);
                var fileName = urlObj.pathname.split('/').pop();
                
                // 解码并去掉后缀
                var cleanName = decodeURIComponent(fileName).replace(/\.[^/.]+$/, "");
                
                if (cleanName && cleanName !== "" && !cleanName.includes("music-api")) {
                    trackNameEl.innerText = cleanName;
                } else {
                    trackNameEl.innerText = "未知旋律 (正在播放)";
                }
            } catch (e) {
                trackNameEl.innerText = "电音律动中...";
            }
        }, 600); // 延迟600ms确保重定向完成
    };

    audioEl.addEventListener('loadstart', nameUpdateHandler, { once: true });
}

// --- 5. 事件绑定 ---
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
    
    fetchNewTrack();
    audioEl.play().then(function() {
        playBtn.style.display = 'none';
        audioContainer.style.display = 'flex';
    }).catch(function(e) { console
