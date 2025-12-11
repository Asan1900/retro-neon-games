import { Game, audio } from '../engine.js';

export class BreakoutGame extends Game {
    constructor(canvasId, onGameOver, onScoreUpdate) {
        super(canvasId);
        this.onGameOver = onGameOver;
        this.onScoreUpdate = onScoreUpdate;

        this.paddle = { x: 0, y: 0, width: 100, height: 15, speed: 500 };
        this.ball = { x: 0, y: 0, radius: 6, dx: 0, dy: 0, speed: 400 };
        this.bricks = [];
        this.powerups = [];

        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.combo = 0;

        this.colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0000ff', '#8800ff'];
    }

    init() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.resetInternal();
        this.onScoreUpdate(this.score);
    }

    resetInternal() {
        // Reset Paddle
        this.paddle.width = 100;
        this.paddle.x = this.width / 2 - this.paddle.width / 2;
        this.paddle.y = this.height - 40;

        // Reset Ball
        this.resetBall();

        // Generate Bricks
        this.generateLevel();

        this.powerups = [];
    }

    resetBall() {
        this.ball.x = this.width / 2;
        this.ball.y = this.height / 2;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5; // Upwards spread
        this.ball.dx = Math.cos(angle) * this.ball.speed;
        this.ball.dy = Math.sin(angle) * this.ball.speed;
    }

    generateLevel() {
        this.bricks = [];
        const rows = 5 + this.level;
        const cols = 8;
        const padding = 10;
        const width = (this.width - (cols + 1) * padding) / cols;
        const height = 20;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Skip some for pattern
                if (Math.random() > 0.9) continue;

                this.bricks.push({
                    x: padding + c * (width + padding),
                    y: padding + 50 + r * (height + padding),
                    width: width,
                    height: height,
                    color: this.colors[r % this.colors.length],
                    active: true,
                    value: (rows - r) * 10
                });
            }
        }
    }

    update(dt) {
        // Paddle Movement
        if (this.input.isPressed('ArrowLeft')) {
            this.paddle.x -= this.paddle.speed * dt;
        }
        if (this.input.isPressed('ArrowRight')) {
            this.paddle.x += this.paddle.speed * dt;
        }

        // Clamp Paddle
        if (this.paddle.x < 0) this.paddle.x = 0;
        if (this.paddle.x + this.paddle.width > this.width) this.paddle.x = this.width - this.paddle.width;

        // Ball Movement
        this.ball.x += this.ball.dx * dt;
        this.ball.y += this.ball.dy * dt;

        // Wall Collisions
        if (this.ball.x - this.ball.radius < 0) {
            this.ball.x = this.ball.radius;
            this.ball.dx *= -1;
            audio.playSound('nav');
        }
        if (this.ball.x + this.ball.radius > this.width) {
            this.ball.x = this.width - this.ball.radius;
            this.ball.dx *= -1;
            audio.playSound('nav');
        }
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.y = this.ball.radius;
            this.ball.dy *= -1;
            audio.playSound('nav');
        }

        // Palette Collision
        if (this.rectCircleColliding(
            this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height,
            this.ball.x, this.ball.radius
        )) {
            // Deflect based on hit position
            const hitPoint = this.ball.x - (this.paddle.x + this.paddle.width / 2);
            const normalizedHit = hitPoint / (this.paddle.width / 2);

            // Speed up slightly
            const currentSpeed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
            const newSpeed = Math.min(currentSpeed * 1.05, 800);

            // Calculate new angle
            const angle = -Math.PI / 2 + normalizedHit * (Math.PI / 3);

            this.ball.dx = Math.cos(angle) * newSpeed;
            this.ball.dy = Math.sin(angle) * newSpeed;

            // Push out of paddle to avoid sticking
            this.ball.y = this.paddle.y - this.ball.radius - 1;

            audio.playSound('eat');
            this.combo = 0;
        }

        // Brick Collisions
        let hitBrick = false;
        let activeBricks = 0;

        for (let brick of this.bricks) {
            if (!brick.active) continue;
            activeBricks++;

            if (this.rectCircleColliding(
                brick.x, brick.y, brick.width, brick.height,
                this.ball.x, this.ball.radius
            )) {
                // Determine bounce direction
                // Simple version: just flip Y if we hit top/bottom, X if side
                // For now, simpler: just flip Y (Breakout usually hits top/bottom)
                // A better approach checks overlap amounts

                const overlapX = Math.min(this.ball.x + this.ball.radius - brick.x, brick.x + brick.width - (this.ball.x - this.ball.radius));
                const overlapY = Math.min(this.ball.y + this.ball.radius - brick.y, brick.y + brick.height - (this.ball.y - this.ball.radius));

                if (overlapX < overlapY) {
                    this.ball.dx *= -1;
                } else {
                    this.ball.dy *= -1;
                }

                brick.active = false;
                this.score += brick.value + this.combo * 10;
                this.combo++;
                this.createExplosion(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);

                audio.playSound('eat');
                this.shake(5);
                hitBrick = true;
                break; // Only hit one brick per frame
            }
        }

        if (hitBrick) {
            this.onScoreUpdate(this.score);
        }

        // Bottom Wall (Death)
        if (this.ball.y - this.ball.radius > this.height) {
            this.lives--;
            audio.playSound('die');
            this.shake(20);

            if (this.lives <= 0) {
                this.onGameOver(this.score);
                this.stop();
            } else {
                this.resetBall();
            }
        }

        // Level Clear
        if (activeBricks === 0 && !hitBrick) { // !hitBrick ensures we don't trigger if we just cleared the last one
            this.level++;
            audio.playSound('clear');
            this.resetBall();
            this.generateLevel();
        }
    }

    rectCircleColliding(rx, ry, rw, rh, cx, cr) {
        const distX = Math.abs(cx - (rx + rw / 2));
        const distY = Math.abs(this.ball.y - (ry + rh / 2));

        if (distX > (rw / 2 + cr)) return false;
        if (distY > (rh / 2 + cr)) return false;

        if (distX <= (rw / 2)) return true;
        if (distY <= (rh / 2)) return true;

        const dx = distX - rw / 2;
        const dy = distY - rh / 2;
        return (dx * dx + dy * dy <= (cr * cr));
    }

    draw(alpha) {
        super.draw(alpha);

        // Draw Paddle
        this.ctx.fillStyle = '#00f3ff';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#00f3ff';
        this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
        this.ctx.shadowBlur = 0;

        // Draw Ball
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw Bricks
        this.bricks.forEach(brick => {
            if (brick.active) {
                this.ctx.fillStyle = brick.color;
                this.ctx.shadowBlur = 5;
                this.ctx.shadowColor = brick.color;
                this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
                this.ctx.shadowBlur = 0;
            }
        });

        // Draw Lives
        this.drawText(`LIVES: ${this.lives}`, 50, this.height - 20, 10, '#ff00de', 'left');
        this.drawText(`LEVEL: ${this.level}`, this.width - 50, this.height - 20, 10, '#00f3ff', 'right');
    }
}
