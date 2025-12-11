/**
 * Simple Game Engine
 */

export class Persistence {
    static saveScore(gameId, score) {
        const key = `retro_arcade_${gameId}_highscore`;
        const current = this.getHighScore(gameId);
        if (score > current) {
            localStorage.setItem(key, score);
            return true; // New record
        }
        return false;
    }

    static getHighScore(gameId) {
        const key = `retro_arcade_${gameId}_highscore`;
        return parseInt(localStorage.getItem(key) || '0', 10);
    }
}

export class InputManager {
    constructor() {
        this.keys = {};
        this.downKeys = {}; // Keys pressed this frame

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (!e.repeat) {
                this.downKeys[e.code] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    isDown(code) {
        return !!this.keys[code];
    }

    isPressed(code) {
        // Return true only on the frame it was pressed
        return !!this.downKeys[code];
    }

    update() {
        // Clear frame-specific flags
        for (let code in this.downKeys) {
            delete this.downKeys[code];
        }
    }
}

export class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.running = false;
        this.paused = false;
        this.gridSize = 20;

        // Handle High DPI
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.lastTime = 0;
        this.deltaTime = 1 / 60; // Fixed timestep

        this.input = new InputManager();
        this.particles = [];
        this.screenshake = 0;
        this.pauseLock = false; // To prevent rapid pause toggling

        // Bind query methods
        this.gameLoop = this.gameLoop.bind(this);
    }

    resize() {
        // We set the canvas internal resolution to match logical size or fixed retro size
        // For simplicity, let's keep it 800x600 internal, scaled by CSS
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.width = 800;
        this.height = 600;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop);
        this.init(); // Child implementation
    }

    stop() {
        this.running = false;
    }

    pause() {
        this.paused = true;
    }

    resume() {
        this.paused = false;
        this.lastTime = performance.now(); // Reset time to avoid jump
        requestAnimationFrame(this.gameLoop);
    }

    gameLoop(currentTime) {
        if (!this.running) return;

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Check for pause toggle
        if (this.input.isPressed('KeyP') || this.input.isPressed('Escape')) {
            // Check if we should ignore this press to prevent flickering
            if (!this.pauseLock) {
                this.paused = !this.paused;
                audio.playSound('nav');
                // visual pause handled by main.js observing this state or via HUD
                // But we can also draw a 'PAUSED' overlay here if we want
                // For now, main.js handles the overlay switching, we just freeze updates
            }
            this.pauseLock = true;
        } else {
            this.pauseLock = false; // Reset lock when key released
        }

        if (!this.paused) {
            this.update(deltaTime);
            this.updateParticles(deltaTime);
        }

        this.draw(1.0);

        if (this.paused) {
            // Draw simple pause overlay on canvas for immediate feedback
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.drawText('PAUSED', this.width / 2, this.height / 2, 40, '#00f3ff', 'center');
        }

        // Always update input to detect resume
        this.input.update();

        requestAnimationFrame(this.gameLoop);
    }

    // Methods to override
    init() { }
    update(dt) { }

    createExplosion(x, y, color, count = 10, speed = 200, life = 1.0, size = 3) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const v = Math.random() * speed;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * v,
                vy: Math.sin(angle) * v,
                life: life + Math.random() * 0.2,
                maxLife: life + 0.2, // For alpha fade if needed
                color: color,
                size: Math.random() * size + 1
            });
        }
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt * 2; // Fade faster

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(alpha) {
        // Clear
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Screenshake
        let dx = 0, dy = 0;
        if (this.screenshake > 0) {
            dx = (Math.random() - 0.5) * this.screenshake;
            dy = (Math.random() - 0.5) * this.screenshake;
            this.ctx.save();
            this.ctx.translate(dx, dy);
            this.screenshake *= 0.9;
            if (this.screenshake < 0.5) this.screenshake = 0;
        }

        // Draw particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
            this.ctx.globalAlpha = 1.0;
        });

        if (this.screenshake > 0) {
            this.ctx.restore();
        }
    }

    shake(magnitude) {
        this.screenshake = magnitude;
    }


    // Utility
    drawText(text, x, y, size = 20, color = 'white', align = 'left', font = 'Press Start 2P') {
        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px "${font}"`;
        this.ctx.textAlign = align;
        this.ctx.fillText(text, x, y);
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, color, count = 10, speed = 100, life = 0.5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const v = Math.random() * speed;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * v,
                vy: Math.sin(angle) * v,
                life: life + Math.random() * 0.2, // vary life slightly
                maxLife: life,
                color: color,
                size: Math.random() * 3 + 1
            });
        }
    }

    update(dt) {
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        });
        this.particles = this.particles.filter(p => p.life > 0);
    }

    draw(ctx) {
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        ctx.globalAlpha = 1.0;
    }
}


export class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterVolume = 0.3;
    }

    playTone(frequency, type, duration) {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        gain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playSound(name) {
        switch (name) {
            case 'nav': this.playTone(440, 'sine', 0.1); break;
            case 'select': this.playTone(880, 'square', 0.1); break;
            case 'eat': this.playTone(600, 'triangle', 0.1); break;
            case 'die': this.playTone(150, 'sawtooth', 0.5); break;
            case 'clear':
                this.playTone(400, 'sine', 0.1);
                setTimeout(() => this.playTone(600, 'sine', 0.1), 100);
                break;
            case 'shoot':
                // chirp
                this.playTone(800, 'square', 0.05);
                break;
            case 'explosion':
                this.playTone(100, 'sawtooth', 0.3);
                break;
        }
    }
}

export const audio = new AudioManager();
