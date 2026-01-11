import { Game } from './core/Game.js';

// Global Error Handler
window.onerror = function (msg, url, line, col, error) {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.top = '10px';
    div.style.left = '10px';
    div.style.color = 'red';
    div.style.backgroundColor = 'rgba(0,0,0,0.8)';
    div.style.padding = '20px';
    div.style.zIndex = '9999';
    div.innerHTML = `<h3>CRITICAL ERROR</h3><p>${msg}</p><p>${url}:${line}:${col}</p><pre>${error?.stack}</pre>`;
    document.body.appendChild(div);
};

try {
    new Game();
} catch (e) {
    console.error("Fatal Game Error:", e);
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.top = '50%';
    div.style.left = '50%';
    div.style.transform = 'translate(-50%, -50%)';
    div.style.color = 'red';
    div.style.fontSize = '24px';
    div.innerText = "FATAL ERROR: " + e.message;
    document.body.appendChild(div);
}
