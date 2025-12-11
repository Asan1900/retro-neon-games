import { Game, audio, ParticleSystem } from '../engine.js';

export class AsteroidsGame extends Game {
    constructor(canvasId, onGameOver, onScoreUpdate) {
        super(canvasId);
        this.onGameOver = onGameOver;
        this.onScoreUpdate = onScoreUpdate;

        this.ship = {
            x: 0, y: 0,
            vx: 0, vy: 0,
            angle: 0,
            thrust: false,
            size: 15
        };

        this.bullets = [];
        this.asteroids = [];
        this.particles = new ParticleSystem();

        this.score = 0;
        this.lives = 3;
        this.level = 1;

        this.invulnerable = 0;
        this.shootCooldown = 0;
    }

    init() {
        this.ship.x = this.width / 2;
        this.ship.y = this.height / 2;
        this.ship.vx = 0;
        this.ship.vy = 0;
        this.ship.angle = -Math.PI / 2;

        this.bullets = [];
        this.asteroids = [];
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.invulnerable = 3;

        this.spawnAsteroids(4);
        this.onScoreUpdate(this.score);
    }

    spawnAsteroids(count) {
        for (let i = 0; i < count; i++) {
            // Spawn away from ship
            let x, y;
            do {
                x = Math.random() * this.width;
                y = Math.random() * this.height;
            } while (this.dist(x, y, this.ship.x, this.ship.y) < 150);

            this.asteroids.push({
                x, y,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                angle: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 2,
                size: 3, // Large
                points: this.generateAsteroidShape(8)
            });
        }
    }

    generateAsteroidShape(vertices) {
        const points = [];
        for (let i = 0; i < vertices; i++) {
            const angle = (i / vertices) * Math.PI * 2;
            const radius = 20 + Math.random() * 10;
            points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
        }
        return points;
    }

    dist(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    update(dt) {
        // Ship controls
        if (this.input.isDown('ArrowLeft')) {
            this.ship.angle -= 5 * dt;
        }
        if (this.input.isDown('ArrowRight')) {
            this.ship.angle += 5 * dt;
        }

        this.ship.thrust = this.input.isDown('ArrowUp');

        if (this.ship.thrust) {
            const accel = 200;
            this.ship.vx += Math.cos(this.ship.angle) * accel * dt;
            this.ship.vy += Math.sin(this.ship.angle) * accel * dt;

            // Particle trail
            if (Math.random() < 0.3) {
                this.particles.emit(
                    this.ship.x - Math.cos(this.ship.angle) * 10,
                    this.ship.y - Math.sin(this.ship.angle) * 10,
                    '#ffaa00', 3, 50, 0.3
                );
            }
        }

        // Friction
        this.ship.vx *= 0.99;
        this.ship.vy *= 0.99;

        // Move ship
        this.ship.x += this.ship.vx * dt;
        this.ship.y += this.ship.vy * dt;

        // Wrap ship
        this.ship.x = (this.ship.x + this.width) % this.width;
        this.ship.y = (this.ship.y + this.height) % this.height;

        // Shoot
        this.shootCooldown -= dt;
        if (this.input.isDown('Space') && this.shootCooldown <= 0) {
            audio.playSound('shoot');
            this.bullets.push({
                x: this.ship.x + Math.cos(this.ship.angle) * 15,
                y: this.ship.y + Math.sin(this.ship.angle) * 15,
                vx: Math.cos(this.ship.angle) * 400 + this.ship.vx,
                vy: Math.sin(this.ship.angle) * 400 + this.ship.vy,
                life: 1.5
            });
            this.shootCooldown = 0.15;
        }

        // Update bullets
        this.bullets.forEach(b => {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.x = (b.x + this.width) % this.width;
            b.y = (b.y + this.height) % this.height;
            b.life -= dt;
        });
        this.bullets = this.bullets.filter(b => b.life > 0);

        // Update asteroids
        this.asteroids.forEach(a => {
            a.x += a.vx * dt;
            a.y += a.vy * dt;
            a.angle += a.rotSpeed * dt;
            a.x = (a.x + this.width) % this.width;
            a.y = (a.y + this.height) % this.height;
        });

        // Bullet vs Asteroid
        this.bullets.forEach(b => {
            if (!b.alive && b.alive !== undefined) return;
            for (let a of this.asteroids) {
                if (a.dead) continue;
                const radius = a.size * 10;
                if (this.dist(b.x, b.y, a.x, a.y) < radius) {
                    b.alive = false;
                    a.dead = true;
                    this.splitAsteroid(a);
                    audio.playSound('explosion');
                    this.shake(3, 0.1);
                    this.particles.emit(a.x, a.y, '#00f3ff', 15, 150, 0.5);
                    this.score += (4 - a.size) * 20;
                    this.onScoreUpdate(this.score);
                    break;
                }
            }
        });

        this.asteroids = this.asteroids.filter(a => !a.dead);
        this.bullets = this.bullets.filter(b => b.alive !== false);

        // Ship vs Asteroid
        this.invulnerable -= dt;
        if (this.invulnerable <= 0) {
            for (let a of this.asteroids) {
                const radius = a.size * 10;
                if (this.dist(this.ship.x, this.ship.y, a.x, a.y) < radius + this.ship.size) {
                    this.lives--;
                    audio.playSound('die');
                    this.shake(15, 0.5);
                    this.particles.emit(this.ship.x, this.ship.y, '#0aff00', 20, 200, 0.8);

                    if (this.lives <= 0) {
                        this.onGameOver(this.score);
                        this.stop();
                    } else {
                        this.ship.x = this.width / 2;
                        this.ship.y = this.height / 2;
                        this.ship.vx = 0;
                        this.ship.vy = 0;
                        this.invulnerable = 3;
                    }
                    break;
                }
            }
        }

        // Next level
        if (this.asteroids.length === 0) {
            this.level++;
            this.spawnAsteroids(4 + this.level);
        }

        this.particles.update(dt);
    }

    splitAsteroid(asteroid) {
        if (asteroid.size <= 1) return;

        for (let i = 0; i < 2; i++) {
            this.asteroids.push({
                x: asteroid.x,
                y: asteroid.y,
                vx: asteroid.vx + (Math.random() - 0.5) * 100,
                vy: asteroid.vy + (Math.random() - 0.5) * 100,
                angle: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 3,
                size: asteroid.size - 1,
                points: this.generateAsteroidShape(6)
            });
        }
    }

    draw(alpha) {
        super.draw(alpha);

        this.particles.draw(this.ctx);

        // Draw ship
        if (this.invulnerable <= 0 || Math.floor(this.invulnerable * 10) % 2 === 0) {
            this.ctx.save();
            this.ctx.translate(this.ship.x, this.ship.y);
            this.ctx.rotate(this.ship.angle);

            this.ctx.strokeStyle = '#0aff00';
            this.ctx.lineWidth = 2;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#0aff00';

            this.ctx.beginPath();
            this.ctx.moveTo(15, 0);
            this.ctx.lineTo(-10, -8);
            this.ctx.lineTo(-5, 0);
            this.ctx.lineTo(-10, 8);
            this.ctx.closePath();
            this.ctx.stroke();

            // Thrust flame
            if (this.ship.thrust) {
                this.ctx.strokeStyle = '#ff6600';
                this.ctx.shadowColor = '#ff6600';
                this.ctx.beginPath();
                this.ctx.moveTo(-5, 0);
                this.ctx.lineTo(-15 - Math.random() * 5, 0);
                this.ctx.stroke();
            }

            this.ctx.restore();
        }

        this.ctx.shadowBlur = 0;

        // Draw asteroids
        this.asteroids.forEach(a => {
            this.ctx.save();
            this.ctx.translate(a.x, a.y);
            this.ctx.rotate(a.angle);

            const scale = a.size / 3;
            this.ctx.strokeStyle = '#00f3ff';
            this.ctx.lineWidth = 2;
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = '#00f3ff';

            this.ctx.beginPath();
            a.points.forEach((p, i) => {
                const x = p.x * scale;
                const y = p.y * scale;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            });
            this.ctx.closePath();
            this.ctx.stroke();

            this.ctx.restore();
        });

        this.ctx.shadowBlur = 0;

        // Draw bullets
        this.ctx.fillStyle = '#ffff00';
        this.bullets.forEach(b => {
            this.ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
        });

        // Draw lives
        for (let i = 0; i < this.lives; i++) {
            this.ctx.save();
            this.ctx.translate(20 + i * 25, this.height - 30);
            this.ctx.strokeStyle = '#0aff00';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(8, 0);
            this.ctx.lineTo(-5, -4);
            this.ctx.lineTo(-3, 0);
            this.ctx.lineTo(-5, 4);
            this.ctx.closePath();
            this.ctx.stroke();
            this.ctx.restore();
        }

        this.postDraw();
    }
}
