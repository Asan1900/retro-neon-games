import { Game, audio, ParticleSystem } from '../engine.js';

const TETROMINOES = {
    I: { shape: [[1, 1, 1, 1]], color: '#00f3ff' }, // Cyan
    J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000ff' }, // Blue
    L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#ff7f00' }, // Orange
    O: { shape: [[1, 1], [1, 1]], color: '#ffff00' }, // Yellow
    S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#0aff00' }, // Green
    T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a000f0' }, // Purple
    Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ff0000' }  // Red
};

export class TetrisGame extends Game {
    constructor(canvasId, onGameOver, onScoreUpdate) {
        super(canvasId);
        this.onGameOver = onGameOver;
        this.onScoreUpdate = onScoreUpdate;

        this.cols = 10;
        this.rows = 20;
        this.blockSize = 28; // Fits in 600px height nicely (20 * 28 = 560)
        this.boardOffset = { x: 0, y: 0 };

        this.board = [];
        this.currPiece = null;
        this.score = 0;

        this.dropCounter = 0;
        this.dropInterval = 1; // seconds

        this.particles = new ParticleSystem();
        this.holdPiece = null;
        this.canHold = true;
    }

    init() {
        this.score = 0;
        this.onScoreUpdate(this.score);
        this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));

        // Center board
        const boardWidth = this.cols * this.blockSize;
        const boardHeight = this.rows * this.blockSize;
        this.boardOffset = {
            x: (this.width - boardWidth) / 2,
            y: (this.height - boardHeight) / 2
        };

        this.spawnPiece();
    }

    spawnPiece() {
        const keys = Object.keys(TETROMINOES);
        const type = keys[Math.floor(Math.random() * keys.length)];
        const piece = TETROMINOES[type];

        this.currPiece = {
            matrix: piece.shape,
            color: piece.color,
            x: Math.floor(this.cols / 2) - Math.floor(piece.shape[0].length / 2),
            y: 0
        };

        // Check game over immediately
        if (this.collide(this.board, this.currPiece)) {
            audio.playSound('die');
            this.onGameOver(this.score);
            this.stop();
        }

        this.dropCounter = 0;
        this.canHold = true;
    }

    rotate(matrix) {
        // Transpose + Reverse rows
        return matrix[0].map((val, index) =>
            matrix.map(row => row[index]).reverse()
        );
    }

    collide(board, piece) {
        const m = piece.matrix;
        const o = { x: piece.x, y: piece.y };

        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                    (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    merge(board, piece) {
        piece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + piece.y][x + piece.x] = piece.color;
                }
            });
        });
    }

    sweep() {
        let rowCount = 0;
        outer: for (let y = this.board.length - 1; y > 0; --y) {
            for (let x = 0; x < this.board[y].length; ++x) {
                if (this.board[y][x] === 0) {
                    continue outer;
                }
            }

            const row = this.board.splice(y, 1)[0].fill(0);
            this.board.unshift(row);
            ++y;
            rowCount++;
        }

        if (rowCount > 0) {
            this.score += rowCount * 100 * rowCount; // 100, 400, 900, 1600
            this.onScoreUpdate(this.score);
            audio.playSound('clear');
            this.shake(5 * rowCount, 0.2);

            // Particles
            for (let i = 0; i < rowCount * 5; i++) {
                this.particles.emit(
                    this.boardOffset.x + Math.random() * this.cols * this.blockSize,
                    this.boardOffset.y + Math.random() * this.rows * this.blockSize, // Simplified y
                    '#ffffff', 2
                );
            }

            this.dropInterval *= 0.99; // Speed up slightly
        }
    }

    update(dt) {
        this.dropCounter += dt;

        // Controls
        if (this.input.isPressed('ArrowLeft')) {
            const p = { ...this.currPiece, x: this.currPiece.x - 1 };
            if (!this.collide(this.board, p)) this.currPiece.x--;
        }
        if (this.input.isPressed('ArrowRight')) {
            const p = { ...this.currPiece, x: this.currPiece.x + 1 };
            if (!this.collide(this.board, p)) this.currPiece.x++;
        }
        if (this.input.isPressed('ArrowUp')) {
            const rotated = this.rotate(this.currPiece.matrix);
            // Basic Wall kick (try pushing left/right)
            let offset = 1;
            const p = { ...this.currPiece, matrix: rotated };
            while (this.collide(this.board, p)) {
                p.x += offset;
                offset = -(offset + (offset > 0 ? 1 : -1));
                if (offset > 2) { // Give up
                    return;
                }
            }
            this.currPiece.matrix = rotated;
            this.currPiece.x = p.x;
        }

        if (this.input.isPressed('ArrowDown')) {
            this.playerDrop();
        }

        if (this.dropCounter > this.dropInterval) {
            this.playerDrop();
        }

        // Hold
        if ((this.input.isPressed('KeyC') || this.input.isPressed('ShiftLeft')) && this.canHold) {
            this.hold();
        }

        this.particles.update(dt);
    }

    hold() {
        if (!this.canHold) return;

        // Reset position/matrix of current piece before holding (store raw type or shape is tricky?)
        // Let's store the matrix and color.
        const pieceToHold = { matrix: this.currPiece.matrix, color: this.currPiece.color };

        if (this.holdPiece) {
            this.currPiece = {
                ...this.holdPiece,
                x: Math.floor(this.cols / 2) - Math.floor(this.holdPiece.matrix[0].length / 2),
                y: 0
            };
            this.holdPiece = pieceToHold;
        } else {
            this.holdPiece = pieceToHold;
            this.spawnPiece();
        }

        this.canHold = false;
    }

    playerDrop() {
        this.dropCounter = 0;
        const p = { ...this.currPiece, y: this.currPiece.y + 1 };
        if (this.collide(this.board, p)) {
            this.merge(this.board, this.currPiece);
            this.shake(2, 0.1); // Small shake on drop
            this.sweep();
            this.spawnPiece();
        } else {
            this.currPiece.y++;
        }
    }

    draw(alpha) {
        super.draw(alpha);

        // Draw Board Background
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(
            this.boardOffset.x,
            this.boardOffset.y,
            this.cols * this.blockSize,
            this.rows * this.blockSize
        );
        this.ctx.strokeStyle = '#333';
        this.ctx.strokeRect(
            this.boardOffset.x,
            this.boardOffset.y,
            this.cols * this.blockSize,
            this.rows * this.blockSize
        );

        // Draw Locked Blocks
        this.board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.drawBlock(x, y, value);
                }
            });
        });

        // Draw Ghost Piece
        if (this.currPiece) {
            let ghostY = this.currPiece.y;
            while (!this.collide(this.board, { ...this.currPiece, y: ghostY + 1 })) {
                ghostY++;
            }

            this.currPiece.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        this.drawBlock(x + this.currPiece.x, y + ghostY, this.currPiece.color, true);
                    }
                });
            });

            // Draw Active Piece
            this.currPiece.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        this.drawBlock(x + this.currPiece.x, y + this.currPiece.y, this.currPiece.color);
                    }
                });
            });
        }

        this.particles.draw(this.ctx);

        // Draw Hold Piece
        if (this.holdPiece) {
            this.drawText('HOLD', this.boardOffset.x - 60, this.boardOffset.y + 20, 15, '#fff', 'center');
            const previewSize = 20;
            this.holdPiece.matrix.forEach((row, y) => {
                row.forEach((val, x) => {
                    if (val) {
                        this.ctx.fillStyle = this.holdPiece.color;
                        this.ctx.fillRect(
                            this.boardOffset.x - 80 + x * previewSize,
                            this.boardOffset.y + 40 + y * previewSize,
                            previewSize, previewSize
                        );
                    }
                });
            });
        }

        this.postDraw();
    }

    drawBlock(x, y, color, isGhost = false) {
        const posX = this.boardOffset.x + x * this.blockSize;
        const posY = this.boardOffset.y + y * this.blockSize;

        this.ctx.fillStyle = isGhost ? `rgba(255,255,255,0.1)` : color;

        if (!isGhost) {
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
        }

        this.ctx.fillRect(posX, posY, this.blockSize, this.blockSize);

        // Inner Bevel
        if (!isGhost) {
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.fillRect(posX, posY, this.blockSize, 4);
            this.ctx.fillRect(posX, posY, 4, this.blockSize);
            this.ctx.shadowBlur = 0;
        }

        this.ctx.shadowBlur = 0;

        // Grid line
        this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        this.ctx.strokeRect(posX, posY, this.blockSize, this.blockSize);
    }
}
