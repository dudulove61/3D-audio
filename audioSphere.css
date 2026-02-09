body { 
    margin: 0; 
    overflow: hidden; 
    /* 解决安卓高度偏移：使用动态视口高度 */
    height: 100vh;
    height: 100dvh; 
    background: radial-gradient(circle at center, #1a0a2e 0%, #000000 100%); 
}

/* 启动按钮 */
#play {
    position: fixed; 
    top: 50%; 
    left: 50%;
    transform: translate(-50%, -50%);
    width: 200px; 
    height: 60px; 
    line-height: 60px;
    background: linear-gradient(45deg, #ff00cc, #3333ff);
    color: white; 
    border-radius: 30px; 
    cursor: pointer;
    text-align: center; 
    font-family: "Microsoft YaHei", sans-serif; 
    font-weight: bold;
    font-size: 18px;
    box-shadow: 0 0 40px rgba(255, 0, 204, 0.8); 
    z-index: 9999;
    transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

#play:hover {
    transform: translate(-50%, -50%) scale(1.1);
}

/* 底部播放器容器 */
#audio-container {
    position: fixed;
    bottom: 0; 
    left: 0;
    width: 100%;
    background: rgba(0, 0, 0, 0.7); 
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    padding: 15px 0;
    display: none; 
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

/* 下一曲按钮 */
#next-btn {
    color: #00f2fe;
    border: 1px solid #00f2fe;
    padding: 6px 18px;
    margin-right: 20px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    transition: 0.3s;
    white-space: nowrap;
    text-shadow: 0 0 5px #00f2fe;
    font-weight: bold;
}

#next-btn:hover {
    background: #00f2fe;
    color: #000;
    box-shadow: 0 0 15px #00f2fe;
}

audio {
    width: 60%;
    filter: invert(1) hue-rotate(180deg) brightness(1.4);
}

#info {
    position: fixed; 
    bottom: 80px; 
    width: 100%;
    text-align: center; 
    color: rgba(255,255,255,0.6); 
    z-index: 10;
    pointer-events: none;
    font-size: 13px;
    letter-spacing: 1px;
    text-shadow: 0 0 10px #000;
}

/* --- 安卓 & 手机端自适应优化 --- */
@media screen and (max-width: 768px) {
    #play { width: 160px; height: 50px; line-height: 50px; font-size: 16px; }
    
    #audio-container { 
        flex-direction: column; 
        /* 增加底部 Padding，防止被安卓系统导航栏遮挡 */
        padding: 10px 0 35px 0; 
    }
    
    #next-btn { 
        margin-right: 0; 
        /* 增加与播放器的间距 */
        margin-bottom: 15px; 
        width: 80%; 
        text-align: center; 
    }
    
    audio { width: 90%; }
    
    /* 抬高提示文字，防止在窄屏安卓机上重叠 */
    #info { bottom: 160px; font-size: 11px; }
}

/* 苹果手机特殊隐藏 */
.is-ios audio::-webkit-media-controls-volume-slider,
.is-ios audio::-webkit-media-controls-mute-button,
.is-ios audio::-webkit-media-controls-volume-control-container {
    display: none !important;
}
