let animId = null;       
let eventId = 0;         
let ballX, ballY;        
let speed = 1;           
let direction = 0;       // 0: Left, 1: Down, 2: Right, 3: Up
let isRunning = false;   
let savedContent = "";   
let changeDirCounter = 0; 
const changeDirThreshold = 60; 

const block5 = document.getElementById('block-5');
const logsContainer = document.getElementById('logs-container');

document.getElementById('btn-play').addEventListener('click', () => {
   
    fetch('server.php?action=clear').catch(err => console.error("Server clear error:", err));

    localStorage.removeItem('local_logs');
    eventId = 0;

    if (!document.getElementById('work')) {
         savedContent = block5.innerHTML; 
    }
    block5.innerHTML = ''; 

    const tmpl = document.getElementById('work-template');
    block5.appendChild(tmpl.content.cloneNode(true));

    initAnimControls();
    logEvent("Work area opened");
});

function initAnimControls() {
    const btnClose = document.getElementById('btn-close');
    const box = document.getElementById('anim');
    const ball = document.getElementById('ball');

    btnClose.addEventListener('click', () => {
        stopAnim();
        block5.innerHTML = savedContent;
        generateReport();
    });
    renderBtn('Start');
    resetBall(box, ball);
}

function resetBall(box, ball) {
   
    ballX = box.clientWidth / 2 - 15;
    ballY = box.clientHeight / 2 - 15;
    
    ball.style.left = ballX + 'px';
    ball.style.top = ballY + 'px';
    
    speed = 1;      
    direction = 0;
    changeDirCounter = 0;
}

function startAnim() {
    if (isRunning) return;
    isRunning = true;
    renderBtn('Stop'); 
    loop();            
    logEvent("Animation Started");
}

function stopAnim() {
    isRunning = false;
    cancelAnimationFrame(animId);
    logEvent("Animation Stopped");
    const area = document.getElementById('btn-area');
    if (area && area.innerText.includes('Stop')) {
        renderBtn('Start');
    }
}

function reloadAnim() {
    const box = document.getElementById('anim');
    const ball = document.getElementById('ball');
    resetBall(box, ball);
    renderBtn('Start');
    document.getElementById('msg-box').innerText = "Reloaded";
    logEvent("Reloaded");
}

function loop() {
    if (!isRunning) return;

    const box = document.getElementById('anim');
    const ball = document.getElementById('ball');

    switch(direction) {
        case 0: ballX -= speed; break; 
        case 1: ballY += speed; break; 
        case 2: ballX += speed; break; 
        case 3: ballY -= speed; break; 
    }

    changeDirCounter++;
    
 
    if (changeDirCounter >= changeDirThreshold) {
        direction++;
        if (direction > 3) direction = 0; 
        
        changeDirCounter = 0; 
        logEvent("Direction changed to " + getDirName(direction)); 
    }


    speed += 0.05; 

    
    ball.style.left = ballX + 'px';
    ball.style.top = ballY + 'px';

   
    const msg = `Dir:${getDirName(direction)} Speed:${speed.toFixed(1)} X:${Math.round(ballX)}`;
    document.getElementById('msg-box').innerText = msg;

    if (Math.floor(speed * 10) % 50 === 0) {
         logEvent("Move: " + msg); 
    }

    if (ballX < -30 || ballX > box.clientWidth || ballY < -30 || ballY > box.clientHeight) {
        isRunning = false;
        cancelAnimationFrame(animId);
        
        logEvent("Ball flew out");
        document.getElementById('msg-box').innerText = "ВИЛІТ!";
        renderBtn('Reload'); 
        return;
    }

    const maxX = box.clientWidth - 30;
    const maxY = box.clientHeight - 30;

    if (ballX <= 0 || ballX >= maxX || ballY <= 0 || ballY >= maxY) {
        const area = document.getElementById('btn-area');
        if (area && !area.innerText.includes('Reload')) {
             logEvent("Touched Wall");
             renderBtn('Reload');
        }
    }

    animId = requestAnimationFrame(loop);
}

function getDirName(d) {
    const names = ['Left', 'Down', 'Right', 'Up'];
    return names[d] || d;
}

function renderBtn(type) {
    const area = document.getElementById('btn-area');
    if (!area) return;
    
    area.innerHTML = ''; 
    
    const btn = document.createElement('button');
    btn.className = 'btn-ctrl'; 
    btn.innerText = type;
    
    if (type === 'Start') btn.onclick = startAnim;
    if (type === 'Stop') { 
        btn.className += ' btn-stop'; 
        btn.onclick = stopAnim; 
    }
    if (type === 'Reload') { 
        btn.className += ' btn-reload'; 
        btn.onclick = reloadAnim; 
    }
    
    area.appendChild(btn);
}

function logEvent(msg) {
    eventId++;
    const now = new Date().toISOString();
    
    const data = { 
        id: eventId, 
        msg: msg, 
        client_time: now 
    };

    fetch('server.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).catch(e => console.error("Fetch Error:", e));

    const ls = JSON.parse(localStorage.getItem('local_logs')) || [];
    ls.push({ 
        ...data, 
        ls_save_time: new Date().toISOString() 
    });
    localStorage.setItem('local_logs', JSON.stringify(ls));
}

async function generateReport() {
    logsContainer.innerHTML = 'Завантаження даних...';
    
    let serverLogs = [];
    try {
        const res = await fetch('server.php');
        serverLogs = await res.json();
    } catch(e) { 
        console.error("Server fetch failed", e);
        logsContainer.innerHTML = "Помилка завантаження з сервера.";
        return;
    }

    const localLogs = JSON.parse(localStorage.getItem('local_logs')) || [];

    let html = `
    <table class="log-table">
        <thead>
            <tr>
                <th style="width: 40%">Подія</th>
                <th>Server Time (PHP)</th>
                <th>Local Save Time (JS)</th>
                <th>Diff (ms)</th>
            </tr>
        </thead>
        <tbody>`;
    
    const len = Math.max(serverLogs.length, localLogs.length);
    
    for (let i = 0; i < len; i++) {
        const s = serverLogs[i] || {};
        const l = localLogs[i] || {};
        
        let diff = '-';
        let sTimeDisplay = '-';
        let lTimeDisplay = '-';

        if (s.server_time && l.ls_save_time) {
            const tServer = new Date(s.server_time).getTime();
            const tLocal = new Date(l.ls_save_time).getTime();
            diff = tServer - tLocal;
            
            sTimeDisplay = s.server_time.split(' ')[1]; 
            lTimeDisplay = l.ls_save_time.split('T')[1].replace('Z', '');
        }

        const diffStyle = (Math.abs(diff) > 200 && diff !== '-') ? 'color: red; font-weight: bold;' : 'color: green;';

        html += `
            <tr>
                <td><b>#${s.id || l.id}</b> ${s.msg || l.msg}</td>
                <td style="background:#e8f5e9">${sTimeDisplay}</td>
                <td style="background:#e3f2fd">${lTimeDisplay}</td>
                <td style="${diffStyle}">${diff}</td>
            </tr>`;
    }

    html += `</tbody></table>`;
    
    html += `
        <div style="margin-top: 10px; font-size: 11px; color: #555;">
            <strong>Аналіз:</strong><br>
            <em>Diff</em> показує затримку між клієнтом і сервером.
        </div>
    `;
    logsContainer.innerHTML = html;
}