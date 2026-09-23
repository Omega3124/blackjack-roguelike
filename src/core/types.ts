export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank =
| 'A'
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K';
  export interface Card {
    readonly suit: Suit;
    readonly rank: Rank;
  }
  export type GameState =
  | {state: 'idle'}
  | {state: 'betting'; balance: number; currentBet: number}
  | {state: 'dealing'; playerHand: Card[]; dealerHand: Card[]}
  | {
     state: 'playerTurn';
     playerHand: Card[];
     dealerHand: Card[];
  }
| {state : 'dealerTurn'; playerHand: Card[]; dealerHand: Card[]}
| { 
    state: 'gameOver';
    result: GameResult;
    playerHand: Card[];
    dealerHand: Card[];
};

export type GameResult =
| 'playerWin'
| 'dealerWin'
| 'push'
| 'blackjack';

export type PlayerAction = 
| 'hit'
| 'stand'
| 'double'
| 'split'
| 'insurance'