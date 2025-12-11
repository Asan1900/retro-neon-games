import { Game, Persistence } from './engine.js';
// We will import games dynamically or here
import { SnakeGame } from './games/snake.js';
import { TetrisGame } from './games/tetris.js';
import { SpaceInvadersGame } from './games/space_invaders.js';
import { AsteroidsGame } from './games/asteroids.js';
import { FroggerGame } from './games/frogger.js';
import { Game2048 } from './games/2048.js';
import { SudokuGame } from './games/sudoku.js';
import { BreakoutGame } from './games/breakout.js';
import { PongGame } from './games/pong.js';

// Setup Mock classes until files exist to prevent runtime crash during dev
// (Wait, we can't import files that don't exist. Let's comment them out and load dynamically or use a map later)
// For now, I will assume I create the files immediately after. 
// Actually, to make main.js valid right now, I'll allow it to throw 404s on module load if I don't create them, 
// OR I create empty files first. I will create empty placeholders in the next step.

const screens = {
    menu: document.getElementById('main-menu'),
    hud: document.getElementById('hud'),
    pause: document.getElementById('pause-screen'),
    gameOver: document.getElementById('game-over-screen')
};

let currentGame = null;

function showScreen(name) {
    Object.values(screens).forEach(s => {
        s.classList.add('hidden');
        s.classList.remove('active');
    });
    if (screens[name]) {
        screens[name].classList.remove('hidden');
        screens[name].classList.add('active');
    }
}

function startGame(gameName) {
    if (currentGame) {
        currentGame.stop();
        currentGame = null;
    }

    const canvasId = 'game-canvas';

    switch (gameName) {
        case 'snake':
            currentGame = new SnakeGame(canvasId, onGameOver, onScoreUpdate);
            break;
        case 'tetris':
            currentGame = new TetrisGame(canvasId, onGameOver, onScoreUpdate);
            break;
        case 'space-invaders':
            currentGame = new SpaceInvadersGame(canvasId, onGameOver, onScoreUpdate);
            break;
        case 'asteroids':
            currentGame = new AsteroidsGame(canvasId, onGameOver, onScoreUpdate);
            break;
        case 'frogger':
            currentGame = new FroggerGame(canvasId, onGameOver, onScoreUpdate);
            break;
        case '2048':
            currentGame = new Game2048(canvasId, onGameOver, onScoreUpdate);
            break;
        case 'sudoku':
            currentGame = new SudokuGame(canvasId, onGameOver, onScoreUpdate);
            break;
        case 'breakout':
            currentGame = new BreakoutGame(canvasId, onGameOver, onScoreUpdate);
            break;
        case 'pong':
            currentGame = new PongGame(canvasId, onGameOver, onScoreUpdate);
            break;
        default:
            console.error('Unknown game:', gameName);
            return;
    }

    showScreen('hud');

    // Load High Score
    const highScore = Persistence.getHighScore(gameName);
    document.getElementById('high-score-value').innerText = highScore;

    updateScore(0);
    currentGame.start();

    // Global key handler for Pause
    window.addEventListener('keydown', handleGlobalKeys);
}

// Global error handler
window.addEventListener('error', (event) => {
    alert('Runtime Error: ' + event.message + '\nLine: ' + event.lineno);
});

// UI Event Listeners
document.querySelectorAll('.menu-btn[data-game]').forEach(btn => {
    btn.addEventListener('click', () => {
        try {
            const game = btn.dataset.game;
            startGame(game);
        } catch (e) {
            console.error(e);
            alert(`Failed to start game: ${e.message}`);
        }
    });
});

document.getElementById('resume-btn').addEventListener('click', () => {
    if (currentGame) {
        try {
            currentGame.resume();
            showScreen('hud');
        } catch (e) {
            alert('Error resuming game: ' + e.message);
        }
    }
});

document.getElementById('quit-btn').addEventListener('click', () => {
    if (currentGame) {
        currentGame.stop();
        currentGame = null;
    }
    showScreen('menu');
});

// Restart current game type
document.getElementById('restart-btn').addEventListener('click', () => {
    if (currentGame) {
        try {
            let gameId = '';
            // Logic to identify game
            if (currentGame instanceof SnakeGame) gameId = 'snake';
            else if (currentGame instanceof TetrisGame) gameId = 'tetris';
            else if (currentGame instanceof SpaceInvadersGame) gameId = 'space-invaders';
            else if (currentGame instanceof AsteroidsGame) gameId = 'asteroids';
            else if (currentGame instanceof FroggerGame) gameId = 'frogger';
            else if (currentGame instanceof Game2048) gameId = '2048';
            else if (currentGame instanceof SudokuGame) gameId = 'sudoku';
            else if (currentGame instanceof BreakoutGame) gameId = 'breakout';
            else if (currentGame instanceof PongGame) gameId = 'pong';

            if (currentGame.constructor.name === 'BreakoutGame' && !gameId) gameId = 'breakout'; // Fallback
            if (currentGame.constructor.name === 'PongGame' && !gameId) gameId = 'pong'; // Fallback

            console.log('Restarting game:', gameId);
            if (gameId) startGame(gameId);
            else throw new Error("Could not identify game to restart");
        } catch (e) {
            alert('Error restarting game: ' + e.message);
        }
    }
});

function onGameOver(score) {
    // Save Score logic
    let gameId = '';
    if (currentGame instanceof SnakeGame) gameId = 'snake';
    else if (currentGame instanceof TetrisGame) gameId = 'tetris';
    else if (currentGame instanceof SpaceInvadersGame) gameId = 'space-invaders';
    else if (currentGame instanceof AsteroidsGame) gameId = 'asteroids';
    else if (currentGame instanceof FroggerGame) gameId = 'frogger';
    else if (currentGame instanceof Game2048) gameId = '2048';
    else if (currentGame instanceof SudokuGame) gameId = 'sudoku';
    else if (currentGame instanceof BreakoutGame) gameId = 'breakout';
    else if (currentGame instanceof PongGame) gameId = 'pong';

    if (gameId) {
        Persistence.saveScore(gameId, score);
    }

    document.getElementById('final-score').innerText = score;
    showScreen('gameOver');
    window.removeEventListener('keydown', handleGlobalKeys);
}

document.getElementById('menu-btn').addEventListener('click', () => {
    showScreen('menu');
});

function onScoreUpdate(score) {
    updateScore(score);
}

function updateScore(score) {
    document.getElementById('score-value').innerText = score;
}

function handleGlobalKeys(e) {
    if (e.key === 'Escape' && currentGame && currentGame.running) {
        currentGame.pause();
        showScreen('pause');
    }
}

// Initial
showScreen('menu');
