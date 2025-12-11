import { Game, audio } from '../engine.js';

export class SudokuGame extends Game {
    constructor(canvasId, onGameOver, onScoreUpdate) {
        super(canvasId);
        this.onGameOver = onGameOver;
        this.onScoreUpdate = onScoreUpdate;

        this.gridSize = 9;
        this.cellSize = 55;
        this.grid = [];
        this.solution = [];
        this.fixed = []; // Cells that can't be changed
        this.selectedCell = { x: 0, y: 0 };
        this.mistakes = 0;
        this.maxMistakes = 3;
        this.score = 0;
    }

    init() {
        this.generatePuzzle();
        this.selectedCell = { x: 0, y: 0 };
        this.mistakes = 0;
        this.score = 0;
        this.onScoreUpdate(this.score);
    }

    generatePuzzle() {
        // Generate a complete valid Sudoku
        this.solution = Array.from({ length: 9 }, () => Array(9).fill(0));
        this.fillGrid(this.solution);

        // Copy to grid and remove some numbers
        this.grid = JSON.parse(JSON.stringify(this.solution));
        this.fixed = Array.from({ length: 9 }, () => Array(9).fill(false));

        // Remove 40-50 numbers for medium difficulty
        const cellsToRemove = 40 + Math.floor(Math.random() * 10);
        let removed = 0;

        while (removed < cellsToRemove) {
            const r = Math.floor(Math.random() * 9);
            const c = Math.floor(Math.random() * 9);

            if (this.grid[r][c] !== 0) {
                this.grid[r][c] = 0;
                removed++;
            } else {
                this.fixed[r][c] = true;
            }
        }

        // Mark fixed cells
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.grid[r][c] !== 0) {
                    this.fixed[r][c] = true;
                }
            }
        }
    }

    fillGrid(grid) {
        // Simple backtracking solver to generate a valid Sudoku
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] === 0) {
                    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                    // Shuffle
                    for (let i = numbers.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
                    }

                    for (let num of numbers) {
                        if (this.isValid(grid, r, c, num)) {
                            grid[r][c] = num;
                            if (this.fillGrid(grid)) {
                                return true;
                            }
                            grid[r][c] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    isValid(grid, row, col, num) {
        // Check row
        for (let c = 0; c < 9; c++) {
            if (grid[row][c] === num) return false;
        }

        // Check column
        for (let r = 0; r < 9; r++) {
            if (grid[r][col] === num) return false;
        }

        // Check 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let r = boxRow; r < boxRow + 3; r++) {
            for (let c = boxCol; c < boxCol + 3; c++) {
                if (grid[r][c] === num) return false;
            }
        }

        return true;
    }

    update(dt) {
        // Navigation
        if (this.input.isPressed('ArrowUp')) {
            this.selectedCell.y = Math.max(0, this.selectedCell.y - 1);
            audio.playSound('nav');
        } else if (this.input.isPressed('ArrowDown')) {
            this.selectedCell.y = Math.min(8, this.selectedCell.y + 1);
            audio.playSound('nav');
        } else if (this.input.isPressed('ArrowLeft')) {
            this.selectedCell.x = Math.max(0, this.selectedCell.x - 1);
            audio.playSound('nav');
        } else if (this.input.isPressed('ArrowRight')) {
            this.selectedCell.x = Math.min(8, this.selectedCell.x + 1);
            audio.playSound('nav');
        }

        // Number input
        for (let i = 1; i <= 9; i++) {
            if (this.input.isPressed(`Digit${i}`) || this.input.isPressed(`Numpad${i}`)) {
                this.placeNumber(i);
            }
        }

        // Delete
        if (this.input.isPressed('Backspace') || this.input.isPressed('Delete') || this.input.isPressed('Digit0')) {
            this.placeNumber(0);
        }

        // Check if solved
        if (this.isSolved()) {
            audio.playSound('clear');
            this.shake(10, 0.5);
            this.score = 1000 - this.mistakes * 100;
            this.onScoreUpdate(this.score);
            this.onGameOver(this.score);
            this.stop();
        }
    }

    placeNumber(num) {
        const r = this.selectedCell.y;
        const c = this.selectedCell.x;

        if (this.fixed[r][c]) return;

        if (num === 0) {
            this.grid[r][c] = 0;
            audio.playSound('nav');
        } else {
            this.grid[r][c] = num;

            if (num === this.solution[r][c]) {
                audio.playSound('eat');
                this.score += 10;
                this.onScoreUpdate(this.score);
            } else {
                audio.playSound('die');
                this.mistakes++;
                this.shake(5, 0.2);

                if (this.mistakes >= this.maxMistakes) {
                    this.onGameOver(this.score);
                    this.stop();
                }
            }
        }
    }

    isSolved() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.grid[r][c] !== this.solution[r][c]) {
                    return false;
                }
            }
        }
        return true;
    }

    draw(alpha) {
        super.draw(alpha);

        const offsetX = (this.width - this.cellSize * 9) / 2;
        const offsetY = (this.height - this.cellSize * 9) / 2 + 20;

        // Draw grid
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const x = offsetX + c * this.cellSize;
                const y = offsetY + r * this.cellSize;

                // Cell background
                if (r === this.selectedCell.y && c === this.selectedCell.x) {
                    this.ctx.fillStyle = '#4a4a6a';
                } else if (this.fixed[r][c]) {
                    this.ctx.fillStyle = '#2a2a3a';
                } else {
                    this.ctx.fillStyle = '#1a1a2a';
                }
                this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

                // Cell border
                this.ctx.strokeStyle = '#444';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);

                // Thick borders for 3x3 boxes
                if (c % 3 === 0) {
                    this.ctx.strokeStyle = '#00f3ff';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(x, y + this.cellSize);
                    this.ctx.stroke();
                }
                if (r % 3 === 0) {
                    this.ctx.strokeStyle = '#00f3ff';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(x + this.cellSize, y);
                    this.ctx.stroke();
                }

                // Number
                if (this.grid[r][c] !== 0) {
                    const color = this.fixed[r][c] ? '#ffffff' : '#0aff00';
                    this.ctx.fillStyle = color;
                    this.ctx.font = '30px "Press Start 2P"';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(this.grid[r][c], x + this.cellSize / 2, y + this.cellSize / 2);
                }
            }
        }

        // Draw outer border
        this.ctx.strokeStyle = '#00f3ff';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(offsetX, offsetY, this.cellSize * 9, this.cellSize * 9);

        // Draw mistakes
        this.drawText(`MISTAKES: ${this.mistakes}/${this.maxMistakes}`, this.width / 2, offsetY - 30, 15, '#ff00de', 'center');

        this.postDraw();
    }
}
