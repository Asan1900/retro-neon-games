import { Game, audio } from '../engine.js';

export class Game2048 extends Game {
    constructor(canvasId, onGameOver, onScoreUpdate) {
        super(canvasId);
        this.onGameOver = onGameOver;
        this.onScoreUpdate = onScoreUpdate;

        this.gridSize = 4;
        this.tileSize = 100;
        this.gap = 10;
        this.grid = [];
        this.score = 0;
        this.moved = false;

        this.colors = {
            2: '#eee4da',
            4: '#ede0c8',
            8: '#f2b179',
            16: '#f59563',
            32: '#f67c5f',
            64: '#f65e3b',
            128: '#edcf72',
            256: '#edcc61',
            512: '#edc850',
            1024: '#edc53f',
            2048: '#edc22e',
            4096: '#3c3a32'
        };
    }

    init() {
        this.grid = Array.from({ length: this.gridSize }, () =>
            Array(this.gridSize).fill(0)
        );
        this.score = 0;
        this.addRandomTile();
        this.addRandomTile();
        this.onScoreUpdate(this.score);
    }

    addRandomTile() {
        const empty = [];
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] === 0) {
                    empty.push({ r, c });
                }
            }
        }

        if (empty.length > 0) {
            const pos = empty[Math.floor(Math.random() * empty.length)];
            this.grid[pos.r][pos.c] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    update(dt) {
        this.moved = false;

        if (this.input.isPressed('ArrowUp')) {
            this.move(0, -1);
        } else if (this.input.isPressed('ArrowDown')) {
            this.move(0, 1);
        } else if (this.input.isPressed('ArrowLeft')) {
            this.move(-1, 0);
        } else if (this.input.isPressed('ArrowRight')) {
            this.move(1, 0);
        }

        if (this.moved) {
            audio.playSound('nav');
            this.addRandomTile();

            if (this.checkWin()) {
                audio.playSound('clear');
                this.shake(10, 0.5);
                // Continue playing
            }

            if (this.checkGameOver()) {
                audio.playSound('die');
                this.onGameOver(this.score);
                this.stop();
            }
        }
    }

    move(dx, dy) {
        const newGrid = JSON.parse(JSON.stringify(this.grid));

        if (dx !== 0) {
            // Horizontal
            for (let r = 0; r < this.gridSize; r++) {
                const row = this.grid[r].filter(v => v !== 0);
                const merged = [];

                if (dx > 0) row.reverse();

                for (let i = 0; i < row.length; i++) {
                    if (i < row.length - 1 && row[i] === row[i + 1]) {
                        merged.push(row[i] * 2);
                        this.score += row[i] * 2;
                        i++; // Skip next
                    } else {
                        merged.push(row[i]);
                    }
                }

                if (dx > 0) merged.reverse();

                while (merged.length < this.gridSize) {
                    if (dx > 0) merged.unshift(0);
                    else merged.push(0);
                }

                newGrid[r] = merged;
            }
        } else {
            // Vertical
            for (let c = 0; c < this.gridSize; c++) {
                const col = [];
                for (let r = 0; r < this.gridSize; r++) {
                    if (this.grid[r][c] !== 0) col.push(this.grid[r][c]);
                }

                const merged = [];

                if (dy > 0) col.reverse();

                for (let i = 0; i < col.length; i++) {
                    if (i < col.length - 1 && col[i] === col[i + 1]) {
                        merged.push(col[i] * 2);
                        this.score += col[i] * 2;
                        i++;
                    } else {
                        merged.push(col[i]);
                    }
                }

                if (dy > 0) merged.reverse();

                while (merged.length < this.gridSize) {
                    if (dy > 0) merged.unshift(0);
                    else merged.push(0);
                }

                for (let r = 0; r < this.gridSize; r++) {
                    newGrid[r][c] = merged[r];
                }
            }
        }

        // Check if anything changed
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] !== newGrid[r][c]) {
                    this.moved = true;
                    break;
                }
            }
        }

        if (this.moved) {
            this.grid = newGrid;
            this.onScoreUpdate(this.score);
        }
    }

    checkWin() {
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] === 2048) return true;
            }
        }
        return false;
    }

    checkGameOver() {
        // Check for empty cells
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] === 0) return false;
            }
        }

        // Check for possible merges
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const val = this.grid[r][c];
                if (c < this.gridSize - 1 && this.grid[r][c + 1] === val) return false;
                if (r < this.gridSize - 1 && this.grid[r + 1][c] === val) return false;
            }
        }

        return true;
    }

    draw(alpha) {
        super.draw(alpha);

        const offsetX = (this.width - (this.tileSize + this.gap) * this.gridSize) / 2;
        const offsetY = (this.height - (this.tileSize + this.gap) * this.gridSize) / 2;

        // Draw grid background
        this.ctx.fillStyle = '#bbada0';
        this.ctx.fillRect(
            offsetX - this.gap,
            offsetY - this.gap,
            (this.tileSize + this.gap) * this.gridSize + this.gap,
            (this.tileSize + this.gap) * this.gridSize + this.gap
        );

        // Draw tiles
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const x = offsetX + c * (this.tileSize + this.gap);
                const y = offsetY + r * (this.tileSize + this.gap);

                const value = this.grid[r][c];

                if (value === 0) {
                    this.ctx.fillStyle = '#cdc1b4';
                } else {
                    this.ctx.fillStyle = this.colors[value] || '#3c3a32';
                }

                this.ctx.fillRect(x, y, this.tileSize, this.tileSize);

                if (value !== 0) {
                    this.ctx.fillStyle = value <= 4 ? '#776e65' : '#f9f6f2';
                    this.ctx.font = value >= 1000 ? '30px "Press Start 2P"' : '40px "Press Start 2P"';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(value, x + this.tileSize / 2, y + this.tileSize / 2);
                }
            }
        }
    }
}
