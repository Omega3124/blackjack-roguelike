import { Card, GameState, GameResult } from './types.js';
import { Deck } from './deck.js';
import { calculateHandScore, isBlackjack, isBust } from './hand.js';

export class BlackjackGame {
  private deck: Deck;
  private state: GameState;
  private bet: number = 0;
  private balance: number = 0;

  constructor(seed: string | number = Date.now()) {
    this.deck = new Deck(seed);
    this.state = { state: 'idle' };
  }

  startGame(bet: number, balance: number): void {
    if (this.state.state !== 'idle') {
      throw new Error('Игра уже идёт!');
    }
    if (bet <= 0 || bet > balance) {
      throw new Error('Некорректная ставка');
    }

    this.bet = bet;
    this.balance = balance;
    this.state = {
      state: 'betting',
      balance,
      currentBet: bet
    };
  }

  deal(): void {
    if (this.state.state !== 'betting') {
      throw new Error('Сначала нужно сделать ставку');
    }

    this.deck.shuffle();

    const playerHand: Card[] = [this.deck.draw(), this.deck.draw()];
    const dealerHand: Card[] = [this.deck.draw(), this.deck.draw()];

    if (isBlackjack(playerHand)) {
      this.state = {
        state: 'gameOver',
        result: 'blackjack',
        playerHand,
        dealerHand
      };
      return;
    }

    this.state = {
      state: 'dealing',
      playerHand,
      dealerHand
    };
  }

  playerTurn(): void {
    if (this.state.state !== 'dealing') {
      throw new Error('Невозможно начать ход игрока');
    }

    // TYPE GUARDTypeScript теперь знает, что это состояние 'dealing'
    const dealingState = this.state;

    this.state = {
      state: 'playerTurn',
      playerHand: dealingState.playerHand,
      dealerHand: dealingState.dealerHand,
      dealerVisibleCard: dealingState.dealerHand[0]
    };
  }

  hit(): void {
    if (this.state.state !== 'playerTurn') {
      throw new Error('Сейчас не ход игрока');
    }

    // TYPE GUARD
    const playerState = this.state;
    const newCard = this.deck.draw();
    const newHand = [...playerState.playerHand, newCard];

    if (isBust(newHand)) {
      this.state = {
        state: 'gameOver',
        result: 'dealerWin',
        playerHand: newHand,
        dealerHand: playerState.dealerHand
      };
      return;
    }

    this.state = {
      state: 'playerTurn',
      playerHand: newHand,
      dealerHand: playerState.dealerHand,
      dealerVisibleCard: playerState.dealerVisibleCard
    };
  }

  stand(): void {
    if (this.state.state !== 'playerTurn') {
      throw new Error('Сейчас не ход игрока');
    }

    // TYPE GUARD
    const playerState = this.state;

    this.state = {
      state: 'dealerTurn',
      playerHand: playerState.playerHand,
      dealerHand: playerState.dealerHand
    };

    this.dealerPlay(playerState.dealerHand);
  }

  private dealerPlay(initialDealerHand: Card[]): void {
    let dealerHand = [...initialDealerHand];

    while (calculateHandScore(dealerHand).total < 17) {
      dealerHand = [...dealerHand, this.deck.draw()];
    }

    this.determineWinner(dealerHand);
  }

  private determineWinner(dealerHand: Card[]): void {
    // TYPE GUARD: проверяем что у нас есть playerHand
    if (this.state.state !== 'dealerTurn') {
      throw new Error('Нельзя определить победителя сейчас');
    }

    const playerHand = this.state.playerHand;
    const playerScore = calculateHandScore(playerHand).total;
    const dealerScore = calculateHandScore(dealerHand).total;

    let result: GameResult;

    if (dealerScore > 21 || playerScore > dealerScore) {
      result = 'playerWin';
    } else if (playerScore < dealerScore) {
      result = 'dealerWin';
    } else {
      result = 'push';
    }

    this.state = {
      state: 'gameOver',
      result,
      playerHand,
      dealerHand
    };
  }

  getState(): GameState {
    return this.state;
  }

  getPayout(): number {
    if (this.state.state !== 'gameOver') {
      return 0;
    }

    switch (this.state.result) {
      case 'blackjack':
        return Math.floor(this.bet * 2.5); 
      case 'playerWin':
        return this.bet * 2;
      case 'push':
        return this.bet;
      case 'dealerWin':
        return 0;
      default:
        return 0;
    }
  }

  reset(): void {
    this.state = { state: 'idle' };
    this.bet = 0;
    this.balance = 0;
  }
}