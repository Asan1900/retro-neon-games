import { Game, audio, ParticleSystem } from '../engine.js';

export class SnakeGame extends Game {
    constructor(canvasId, onGameOver, onScoreUpdate) {
        super(canvasId);
        this.onGameOver = onGameOver;
        this.onScoreUpdate = onScoreUpdate;

        this.gridSize = 25; // Size of one cell
        this.cols = 0; // Calculated in resize
        this.rows = 0;

        // Colors
        this.colorHead = '#0aff00'; // Neon Green
        this.colorBody = '#00f3ff'; // Neon Blue
        this.colorFood = '#ff00de'; // Neon Pink

        this.snake = [];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.food = null;
        this.score = 0;

        // Effects
        this.foodPulse = 0;
        this.particles = new ParticleSystem();
    }

    init() {
        this.cols = Math.floor(this.width / this.gridSize);
        this.rows = Math.floor(this.height / this.gridSize);

        // Start in middle
        const startX = Math.floor(this.cols / 2);
        const startY = Math.floor(this.rows / 2);

        this.snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY }
        ];

        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.score = 0;
        this.spawnFood();

        // Speed
        this.speed = 10; // moves per second
        this.moveTimer = 0;

        this.onScoreUpdate(this.score);
    }

    spawnFood() {
        let valid = false;
        while (!valid) {
            const x = Math.floor(Math.random() * this.cols);
            const y = Math.floor(Math.random() * this.rows);

            // Check collision with snake
            let collision = false;
            for (let segment of this.snake) {
                if (segment.x === x && segment.y === y) {
                    collision = true;
                    break;
                }
            }

            if (!collision) {
                this.food = { x, y };
                valid = true;
            }
        }
    }

    update(dt) {
        // Input
        if (this.input.isPressed('ArrowUp') && this.direction.y === 0) {
            this.nextDirection = { x: 0, y: -1 };
        } else if (this.input.isPressed('ArrowDown') && this.direction.y === 0) {
            this.nextDirection = { x: 0, y: 1 };
        } else if (this.input.isPressed('ArrowLeft') && this.direction.x === 0) {
            this.nextDirection = { x: -1, y: 0 };
        } else if (this.input.isPressed('ArrowRight') && this.direction.x === 0) {
            this.nextDirection = { x: 1, y: 0 };
        }

        // Updates
        this.foodPulse += dt * 5;
        this.moveTimer += dt;

        if (this.moveTimer > (1 / this.speed)) {
            this.moveTimer = 0;
            this.step();
        }

        this.particles.update(dt);
    }

    step() {
        this.direction = this.nextDirection;

        const head = this.snake[0];
        const newHead = {
            x: head.x + this.direction.x,
            y: head.y + this.direction.y
        };

        // Wall Collision
        if (newHead.x < 0 || newHead.x >= this.cols || newHead.y < 0 || newHead.y >= this.rows) {
            this.die();
            return;
        }

        // Self Collision
        for (let segment of this.snake) {
            if (newHead.x === segment.x && newHead.y === segment.y) {
                this.die();
                return;
            }
        }

        // Move
        this.snake.unshift(newHead);

        // Eat Food
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            this.score += 10;
            audio.playSound('eat');
            this.shake(5, 0.2);
            this.particles.emit(
                newHead.x * this.gridSize + this.gridSize / 2,
                newHead.y * this.gridSize + this.gridSize / 2,
                this.colorFood,
                10
            );
            this.speed = Math.min(20, 10 + Math.floor(this.score / 50)); // Increase speed slowly
            this.onScoreUpdate(this.score);
            this.spawnFood();
            // Don't pop tail (grow)
        } else {
            this.snake.pop();
        }
    }

    die() {
        audio.playSound('die');
        this.shake(20, 0.5);
        this.stop();
        this.onGameOver(this.score);
    }

    draw(alpha) {
        super.draw(alpha);

        this.particles.draw(this.ctx);


        // Draw Grid (subtle)
        this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= this.width; x += this.gridSize) {
            this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.height); this.ctx.stroke();
        }
        for (let y = 0; y <= this.height; y += this.gridSize) {
            this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.width, y); this.ctx.stroke();
        }

        // Draw Food
        if (this.food) {
            const pulse = Math.abs(Math.sin(this.foodPulse));
            const foodSize = this.gridSize * (0.6 + pulse * 0.2);
            const foodOffset = (this.gridSize - foodSize) / 2;

            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = this.colorFood;
            this.ctx.fillStyle = this.colorFood;
            this.ctx.fillRect(
                this.food.x * this.gridSize + foodOffset,
                this.food.y * this.gridSize + foodOffset,
                foodSize,
                foodSize
            );
            this.ctx.shadowBlur = 0;
        }

        // Draw Snake
        this.snake.forEach((segment, index) => {
            const isHead = index === 0;
            this.ctx.fillStyle = isHead ? this.colorHead : this.colorBody;

            if (isHead) {
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = this.colorHead;
            } else {
                this.ctx.shadowBlur = 0;
            }

            // Slight inset for segments so they look like blocks
            const inset = 2;
            this.ctx.fillRect(
                segment.x * this.gridSize + inset,
                segment.y * this.gridSize + inset,
                this.gridSize - inset * 2,
                this.gridSize - inset * 2
            );
        });

        this.ctx.shadowBlur = 0;
    }
}
