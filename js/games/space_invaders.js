import { Game, audio } from '../engine.js';

export class SpaceInvadersGame extends Game {
    constructor(canvasId, onGameOver, onScoreUpdate) {
        super(canvasId);
        this.onGameOver = onGameOver;
        this.onScoreUpdate = onScoreUpdate;

        this.player = { x: 0, y: 0, width: 30, height: 20, speed: 300, cooldown: 0 };
        this.bullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.particles = [];

        this.waveDir = 1;
        this.waveTimer = 0;
        this.waveSpeed = 1; // secs per move
        this.waveMoveSpeed = 10;

        this.level = 1;
    }

    init() {
        this.score = 0;
        this.level = 1;
        this.player.x = this.width / 2 - this.player.width / 2;
        this.player.y = this.height - 40;
        this.spawnWave();
        this.onScoreUpdate(this.score);
    }

    spawnWave() {
        this.enemies = [];
        const rows = 4 + Math.min(this.level, 3);
        const cols = 8 + Math.min(this.level, 2);

        const startX = 50;
        const startY = 50;
        const gapX = 50;
        const gapY = 40;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this.enemies.push({
                    x: startX + c * gapX,
                    y: startY + r * gapY,
                    width: 30,
                    height: 20,
                    type: r % 2 === 0 ? 'A' : 'B'
                });
            }
        }

        this.waveSpeed = Math.max(0.2, 1.0 - this.level * 0.1);
        this.bullets = [];
        this.enemyBullets = [];
        this.particles = [];
    }

    update(dt) {
        // Player
        if (this.input.isDown('ArrowLeft')) {
            this.player.x -= this.player.speed * dt;
        }
        if (this.input.isDown('ArrowRight')) {
            this.player.x += this.player.speed * dt;
        }

        // Clamp Player
        this.player.x = Math.max(0, Math.min(this.width - this.player.width, this.player.x));

        // Shoot
        this.player.cooldown -= dt;
        if ((this.input.isPressed('Space') || this.input.isPressed('ArrowUp')) && this.player.cooldown <= 0) {
            audio.playSound('shoot');
            this.bullets.push({ x: this.player.x + this.player.width / 2, y: this.player.y, valid: true });
            this.player.cooldown = 0.4;
        }

        // Update Bullets
        this.bullets.forEach(b => {
            b.y -= 500 * dt;
            if (b.y < 0) b.valid = false;
        });

        this.enemyBullets.forEach(b => {
            b.y += 300 * dt;
            if (b.y > this.height) b.valid = false;

            // Player Hit
            if (b.x >= this.player.x && b.x <= this.player.x + this.player.width &&
                b.y >= this.player.y && b.y <= this.player.y + this.player.height) {
                audio.playSound('die');
                this.onGameOver(this.score);
                this.stop();
            }
        });

        this.bullets = this.bullets.filter(b => b.valid);
        this.enemyBullets = this.enemyBullets.filter(b => b.valid);

        // Update Enemies
        this.waveTimer += dt;
        if (this.waveTimer > this.waveSpeed) {
            this.waveTimer = 0;
            let touchEdge = false;

            this.enemies.forEach(e => {
                if ((e.x <= 10 && this.waveDir === -1) || (e.x >= this.width - 40 && this.waveDir === 1)) {
                    touchEdge = true;
                }
            });

            if (touchEdge) {
                this.waveDir *= -1;
                this.enemies.forEach(e => e.y += 20);

                // Game Over if reached bottom
                if (this.enemies.some(e => e.y + e.height >= this.player.y)) {
                    this.onGameOver(this.score);
                    this.stop();
                }
            } else {
                this.enemies.forEach(e => e.x += this.waveMoveSpeed * this.waveDir * 2); // Jump
            }

            // Random Enemy Shoot
            if (Math.random() < 0.3 + (this.level * 0.05)) {
                if (this.enemies.length > 0) {
                    const shooter = this.enemies[Math.floor(Math.random() * this.enemies.length)];
                    this.enemyBullets.push({ x: shooter.x + shooter.width / 2, y: shooter.y + shooter.height, valid: true });
                }
            }
        }

        // Bullet vs Enemy Collision
        this.bullets.forEach(b => {
            if (!b.valid) return;
            for (let e of this.enemies) {
                if (b.x >= e.x && b.x <= e.x + e.width &&
                    b.y >= e.y && b.y <= e.y + e.height) {
                    e.dead = true;
                    b.valid = false;
                    this.score += 10;
                    audio.playSound('explosion');
                    this.spawnParticles(e.x + e.width / 2, e.y + e.height / 2, '#ff00de');
                    break;
                }
            }
        });

        if (this.enemies.some(e => e.dead)) {
            this.enemies = this.enemies.filter(e => !e.dead);
            this.onScoreUpdate(this.score);

            if (this.enemies.length === 0) {
                this.level++;
                this.spawnWave();
            }
        }

        // Particles
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        });
        this.particles = this.particles.filter(p => p.life > 0);
    }

    spawnParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 0.5,
                color: color
            });
        }
    }

    draw(alpha) {
        super.draw(alpha);

        // Draw Player
        this.ctx.fillStyle = '#0aff00';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#0aff00';
        // Simple shape
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x + this.player.width / 2, this.player.y);
        this.ctx.lineTo(this.player.x + this.player.width, this.player.y + this.player.height);
        this.ctx.lineTo(this.player.x, this.player.y + this.player.height);
        this.ctx.fill();

        // Draw Enemies
        this.enemies.forEach(e => {
            this.ctx.fillStyle = e.type === 'A' ? '#ff00de' : '#00f3ff';
            this.ctx.shadowColor = this.ctx.fillStyle;
            this.ctx.fillRect(e.x, e.y, e.width, e.height);
        });

        // Draw Bullets
        this.ctx.fillStyle = '#ffff00';
        this.bullets.forEach(b => {
            this.ctx.fillRect(b.x - 2, b.y - 10, 4, 10);
        });

        this.ctx.fillStyle = '#ff0000';
        this.enemyBullets.forEach(b => {
            this.ctx.fillRect(b.x - 2, b.y, 4, 10);
        });

        this.ctx.shadowBlur = 0;

        // Particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life / 0.5;
            this.ctx.fillRect(p.x, p.y, 3, 3);
        });
        this.ctx.globalAlpha = 1.0;
    }
}
