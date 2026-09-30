import { N } from "node_modules/vitest/dist/chunks/config.d.CU_b-wJj";

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
}

export type GameResult = 'playerWin' | 'dealerWin' | 'push' | 'blackjack';

export type PlayerAction = 'hit' | 'stand' | 'double' | 'split' | 'insurance';

// Состояние с несколькими руками (для split)
export type PlayerTurnState = {
  state: 'playerTurn';
  playerHands: Card[][];
  currentHandIndex: number;
  dealerHand: Card[];
  dealerVisibleCard: Card;
  bets: number[];
  splitAces: boolean;
  insuranceAvailable: boolean;
  insuranceBet: number;
};

export type GameState =
  | { state: 'idle' }
  | { state: 'betting'; balance: number; currentBet: number }
  | { state: 'dealing'; playerHand: Card[]; dealerHand: Card[] }
  | PlayerTurnState
  | { 
      state: 'dealerTurn'; 
      playerHands: Card[][]; 
      dealerHand: Card[]; 
      bets: number[];
      splitAces?: boolean;
      insuranceBet?: number;
    }
  | { 
      state: 'gameOver'; 
      result: GameResult; 
      playerHands: Card[][]; 
      dealerHand: Card[]; 
      bets: number[];
      splitAces?: boolean;
      insuranceBet?: number;
    };