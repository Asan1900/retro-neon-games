import { Game, audio } from '../engine.js';

export class FroggerGame extends Game {
    constructor(canvasId, onGameOver, onScoreUpdate) {
        super(canvasId);
        this.onGameOver = onGameOver;
        this.onScoreUpdate = onScoreUpdate;

        this.gridSize = 40;
        this.cols = 20;
        this.rows = 15;

        this.frog = { x: 0, y: 0 };
        this.lanes = [];
        // this.particles handled by base class
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.goalsFilled = [];
    }

    init() {
        this.frog.x = Math.floor(this.cols / 2);
        this.frog.y = this.rows - 1;

        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.goalsFilled = [];

        this.setupLanes();
        this.onScoreUpdate(this.score);
    }

    setupLanes() {
        this.lanes = [];

        // Safe zone at bottom
        this.lanes.push({ type: 'safe', y: this.rows - 1, items: [] });

        // Road lanes (cars)
        for (let i = 0; i < 5; i++) {
            const y = this.rows - 2 - i;
            const speed = (50 + Math.random() * 50) * (i % 2 === 0 ? 1 : -1);
            const items = [];
            const gap = 3 + Math.floor(Math.random() * 3);

            for (let x = 0; x < this.cols; x += gap) {
                items.push({
                    x: x + Math.random() * gap,
                    width: 1 + Math.floor(Math.random() * 2),
                    color: i % 2 === 0 ? '#ff00de' : '#ff6600'
                });
            }

            this.lanes.push({ type: 'road', y, speed, items });
        }

        // Safe zone in middle
        this.lanes.push({ type: 'safe', y: this.rows - 8, items: [] });

        // River lanes (logs)
        for (let i = 0; i < 5; i++) {
            const y = this.rows - 9 - i;
            const speed = (40 + Math.random() * 40) * (i % 2 === 0 ? -1 : 1);
            const items = [];
            const gap = 4 + Math.floor(Math.random() * 3);

            for (let x = 0; x < this.cols; x += gap) {
                items.push({
                    x: x + Math.random() * gap,
                    width: 2 + Math.floor(Math.random() * 2),
                    color: '#8B4513'
                });
            }

            this.lanes.push({ type: 'river', y, speed, items });
        }

        // Goal zone
        this.lanes.push({ type: 'goal', y: 0, items: [] });
    }

    update(dt) {
        // Input
        if (this.input.isPressed('ArrowUp')) {
            this.moveFrog(0, -1);
        } else if (this.input.isPressed('ArrowDown')) {
            this.moveFrog(0, 1);
        } else if (this.input.isPressed('ArrowLeft')) {
            this.moveFrog(-1, 0);
        } else if (this.input.isPressed('ArrowRight')) {
            this.moveFrog(1, 0);
        }

        // Update lanes
        this.lanes.forEach(lane => {
            if (lane.type === 'road' || lane.type === 'river') {
                lane.items.forEach(item => {
                    item.x += lane.speed * dt / this.gridSize;

                    // Wrap
                    if (lane.speed > 0 && item.x > this.cols + 2) {
                        item.x = -item.width - 2;
                    } else if (lane.speed < 0 && item.x < -item.width - 2) {
                        item.x = this.cols + 2;
                    }
                });
            }
        });

        // Check collisions
        const currentLane = this.lanes.find(l => l.y === this.frog.y);

        if (currentLane.type === 'road') {
            // Check if hit by car
            for (let car of currentLane.items) {
                if (this.frog.x >= car.x && this.frog.x < car.x + car.width) {
                    this.die();
                    return;
                }
            }
        } else if (currentLane.type === 'river') {
            // Check if on log
            let onLog = false;
            for (let log of currentLane.items) {
                if (this.frog.x >= log.x && this.frog.x < log.x + log.width) {
                    onLog = true;
                    // Move with log
                    this.frog.x += currentLane.speed * dt / this.gridSize;
                    break;
                }
            }

            if (!onLog) {
                this.die();
                return;
            }
        } else if (currentLane.type === 'goal') {
            // Reached goal
            const goalX = Math.floor(this.frog.x);
            this.goalsFilled.push(goalX);
            this.score += 100;
            audio.playSound('eat');
            this.shake(5, 0.2);
            this.createExplosion(
                this.frog.x * this.gridSize + this.gridSize / 2,
                this.frog.y * this.gridSize + this.gridSize / 2,
                '#0aff00', 20
            );
            this.onScoreUpdate(this.score);

            // Check if all goals filled
            if (this.goalsFilled.length >= 5) {
                this.level++;
                this.goalsFilled = [];
                this.setupLanes();
            }

            // Reset position
            this.frog.x = Math.floor(this.cols / 2);
            this.frog.y = this.rows - 1;
        }

        // Check bounds
        if (this.frog.x < 0 || this.frog.x >= this.cols) {
            this.die();
        }
    }

    moveFrog(dx, dy) {
        this.frog.x += dx;
        this.frog.y += dy;

        // Clamp Y
        this.frog.y = Math.max(0, Math.min(this.rows - 1, this.frog.y));

        audio.playSound('nav');
        this.score += dy < 0 ? 10 : 0; // Points for moving forward
        this.onScoreUpdate(this.score);
    }

    die() {
        this.lives--;
        audio.playSound('die');
        this.shake(15, 0.4);
        this.createExplosion(
            this.frog.x * this.gridSize + this.gridSize / 2,
            this.frog.y * this.gridSize + this.gridSize / 2,
            '#0aff00', 20, 150
        );

        if (this.lives <= 0) {
            this.onGameOver(this.score);
            this.stop();
        } else {
            this.frog.x = Math.floor(this.cols / 2);
            this.frog.y = this.rows - 1;
        }
    }

    draw(alpha) {
        super.draw(alpha);

        // Draw lanes
        this.lanes.forEach(lane => {
            const y = lane.y * this.gridSize;

            if (lane.type === 'safe') {
                this.ctx.fillStyle = '#1a1a2e';
            } else if (lane.type === 'road') {
                this.ctx.fillStyle = '#2a2a3e';
            } else if (lane.type === 'river') {
                this.ctx.fillStyle = '#0a3a5a';
            } else if (lane.type === 'goal') {
                this.ctx.fillStyle = '#1a3a1a';
            }

            this.ctx.fillRect(0, y, this.width, this.gridSize);

            // Draw items
            lane.items.forEach(item => {
                this.ctx.fillStyle = item.color;
                this.ctx.shadowBlur = 5;
                this.ctx.shadowColor = item.color;
                this.ctx.fillRect(
                    item.x * this.gridSize,
                    y + 5,
                    item.width * this.gridSize,
                    this.gridSize - 10
                );
            });
        });

        this.ctx.shadowBlur = 0;

        // Draw goals
        for (let i = 0; i < 5; i++) {
            const x = (2 + i * 4) * this.gridSize;
            const filled = this.goalsFilled.includes(2 + i * 4);
            this.ctx.fillStyle = filled ? '#0aff00' : '#333';
            this.ctx.fillRect(x, 5, this.gridSize, this.gridSize - 10);
        }

        // Draw frog
        this.ctx.fillStyle = '#0aff00';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#0aff00';
        this.ctx.fillRect(
            this.frog.x * this.gridSize + 5,
            this.frog.y * this.gridSize + 5,
            this.gridSize - 10,
            this.gridSize - 10
        );

        this.ctx.shadowBlur = 0;

        // Draw lives
        for (let i = 0; i < this.lives; i++) {
            this.ctx.fillStyle = '#0aff00';
            this.ctx.fillRect(10 + i * 25, this.height - 25, 20, 20);
        }
    }
}
