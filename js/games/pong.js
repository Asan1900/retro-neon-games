import { Game, audio } from '../engine.js';

export class PongGame extends Game {
    constructor(canvasId, onGameOver, onScoreUpdate) {
        super(canvasId);
        this.onGameOver = onGameOver;
        this.onScoreUpdate = onScoreUpdate;

        this.paddleHeight = 80;
        this.paddleWidth = 15;
        this.paddleSpeed = 400;

        this.player = { x: 30, y: 0, score: 0 };
        this.ai = { x: 0, y: 0, score: 0, speed: 350 };

        this.ball = { x: 0, y: 0, radius: 8, dx: 0, dy: 0, speed: 400 };
    }

    init() {
        this.player.score = 0;
        this.ai.score = 0;

        this.ai.x = this.width - 30 - this.paddleWidth;
        this.player.y = this.height / 2 - this.paddleHeight / 2;
        this.ai.y = this.height / 2 - this.paddleHeight / 2;

        this.resetBall();
        this.onScoreUpdate(this.player.score);
    }

    resetBall() {
        this.ball.x = this.width / 2;
        this.ball.y = this.height / 2;

        // Random start direction
        const dir = Math.random() > 0.5 ? 1 : -1;
        const angle = (Math.random() - 0.5) * Math.PI / 3; // within 60 degrees

        this.ball.dx = Math.cos(angle) * this.ball.speed * dir;
        this.ball.dy = Math.sin(angle) * this.ball.speed;

        this.ball.speed = 400; // Reset speed
    }

    update(dt) {
        // Player Movement
        if (this.input.isPressed('ArrowUp')) {
            this.player.y -= this.paddleSpeed * dt;
        }
        if (this.input.isPressed('ArrowDown')) {
            this.player.y += this.paddleSpeed * dt;
        }

        // Clamp Player
        this.player.y = Math.max(0, Math.min(this.height - this.paddleHeight, this.player.y));

        // AI Movement (Simple tracking)
        // Add some reaction delay or "mistake" probability for realism/fairness ideally
        const center = this.ai.y + this.paddleHeight / 2;
        if (this.ball.y < center - 10) {
            this.ai.y -= this.ai.speed * dt;
        } else if (this.ball.y > center + 10) {
            this.ai.y += this.ai.speed * dt;
        }
        this.ai.y = Math.max(0, Math.min(this.height - this.paddleHeight, this.ai.y));

        // Ball Movement
        this.ball.x += this.ball.dx * dt;
        this.ball.y += this.ball.dy * dt;

        // Top/Bottom collisions
        if (this.ball.y - this.ball.radius < 0 || this.ball.y + this.ball.radius > this.height) {
            this.ball.dy *= -1;
            audio.playSound('nav');
        }

        // Paddle Collisions
        // Player
        if (this.ball.dx < 0 &&
            this.ball.x - this.ball.radius < this.player.x + this.paddleWidth &&
            this.ball.x + this.ball.radius > this.player.x &&
            this.ball.y > this.player.y && this.ball.y < this.player.y + this.paddleHeight
        ) {
            this.hitPaddle(this.player, 1);
        }

        // AI
        if (this.ball.dx > 0 &&
            this.ball.x + this.ball.radius > this.ai.x &&
            this.ball.x - this.ball.radius < this.ai.x + this.paddleWidth &&
            this.ball.y > this.ai.y && this.ball.y < this.ai.y + this.paddleHeight
        ) {
            this.hitPaddle(this.ai, -1);
        }

        // Scoring
        if (this.ball.x < 0) {
            // AI Scored
            this.ai.score++;
            audio.playSound('die');
            this.shake(10);
            this.resetBall();
        } else if (this.ball.x > this.width) {
            // Player Scored
            this.player.score++;
            audio.playSound('eat');
            this.createExplosion(this.width, this.ball.y, '#0aff00', 20);
            this.shake(10);
            this.onScoreUpdate(this.player.score);
            this.resetBall();
        }

        // Game Over Condition (First to 10)
        if (this.player.score >= 10 || this.ai.score >= 10) {
            this.onGameOver(this.player.score);
            this.stop();
        }
    }

    hitPaddle(paddle, direction) {
        this.ball.speed *= 1.05;

        // Calculate hit position relative to center [-1, 1]
        const hitPoint = (this.ball.y - (paddle.y + this.paddleHeight / 2)) / (this.paddleHeight / 2);

        const angle = hitPoint * Math.PI / 4; // Max 45 degrees

        this.ball.dx = direction * Math.cos(angle) * this.ball.speed;
        this.ball.dy = Math.sin(angle) * this.ball.speed;

        audio.playSound('nav');
        this.createExplosion(this.ball.x, this.ball.y, '#ffffff', 5);
    }

    draw(alpha) {
        super.draw(alpha);

        // Center line
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.width / 2, 0);
        this.ctx.lineTo(this.width / 2, this.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Player
        this.ctx.fillStyle = '#00f3ff';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#00f3ff';
        this.ctx.fillRect(this.player.x, this.player.y, this.paddleWidth, this.paddleHeight);

        // AI
        this.ctx.fillStyle = '#ff00de';
        this.ctx.shadowColor = '#ff00de';
        this.ctx.fillRect(this.ai.x, this.ai.y, this.paddleWidth, this.paddleHeight);

        this.ctx.shadowBlur = 0;

        // Ball
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Scores
        this.drawText(this.player.score, this.width / 4, 50, 40, '#00f3ff', 'center');
        this.drawText(this.ai.score, this.width * 0.75, 50, 40, '#ff00de', 'center');
    }
}
