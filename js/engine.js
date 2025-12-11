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

        // Handle High DPI
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.lastTime = 0;
        this.accumulator = 0;
        this.deltaTime = 1 / 60; // Fixed timestep

        this.isRunning = false;
        this.isPaused = false;

        this.input = new InputManager();

        // Juice
        this.shakeTime = 0;
        this.shakeMagnitude = 0;


        // Bind query methods
        this.loop = this.loop.bind(this);
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
        if (this.isRunning) return;
        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
        this.init(); // Child implementation
    }

    stop() {
        this.isRunning = false;
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
        this.lastTime = performance.now(); // Reset time to avoid jump
        requestAnimationFrame(this.loop);
    }

    loop(currentTime) {
        if (!this.isRunning || this.isPaused) return;

        const frameTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Cap frame time to avoid spiral of death
        const safeFrameTime = Math.min(frameTime, 0.25);

        this.accumulator += safeFrameTime;

        while (this.accumulator >= this.deltaTime) {
            this.update(this.deltaTime);
            if (this.shakeTime > 0) this.shakeTime -= this.deltaTime;
            this.input.update(); // Clear single-frame inputs
            this.accumulator -= this.deltaTime;
        }

        this.draw(this.accumulator / this.deltaTime); // Alpha for interpolation if needed

        requestAnimationFrame(this.loop);
    }

    // Methods to override
    init() { }
    update(dt) { }
    draw(alpha) {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Apply Shake
        if (this.shakeTime > 0) {
            const dx = (Math.random() - 0.5) * 2 * this.shakeMagnitude;
            const dy = (Math.random() - 0.5) * 2 * this.shakeMagnitude;
            this.ctx.save();
            this.ctx.translate(dx, dy);
        }
    }

    postDraw() {
        if (this.shakeTime > 0) {
            this.ctx.restore();
        }
    }

    shake(magnitude, duration) {
        this.shakeMagnitude = magnitude;
        this.shakeTime = duration;
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
