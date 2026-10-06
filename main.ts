import { BlackjackGame } from './src/core/game.js';

const game = new BlackjackGame('browser-seed');
game.startGame(100, 1000);
game.deal();
game.playerTurn();

console.log(game.getState());