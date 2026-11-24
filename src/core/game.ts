import { Card, GameState, GameResult } from './types.js';
import { Deck } from './deck.js';
import { calculateHandScore, isBlackjack, isBust } from './hand.js';

export class BlackjackGame {
  private deck: Deck;
  private state: GameState;
  private bet: number = 0;
  private balance: number = 0;
  private perks: string[] = [];
  private towerApplied = false;
  private wheelUsed = false;
  private hangedManUsed = false;
  private foolEffectId: string | null = null;
  private moonActive = false;
  private dealerStandThreshold = 17;
  private lastDrawnCard: Card | null = null;
  

  constructor(seed: string | number = Date.now()) {
    this.deck = new Deck(seed);
    this.state = { state: 'idle' };
  }

  startGame(bet: number, balance: number, perks: string[] = []): void {
    if (this.state.state !== 'idle') {
      throw new Error('Игра уже идёт!');
    }
    if (bet <= 0 || bet > balance) {
      throw new Error('Некорректная ставка');
    }
    const actualBet = this.moonActive ? bet * 2 : bet;
    this.bet = actualBet;
    this.balance = balance;
    this.perks = perks;
    this.towerApplied = false;
    this.wheelUsed = false;
    this.hangedManUsed = false;
    this.lastDrawnCard = null;
    this.dealerStandThreshold = 17;
    this.moonActive = false;
    this.state = {
      state: 'betting',
      balance,
      currentBet: actualBet
    };
  }

  applyFoolEffect(effectId: string): void {
    this.foolEffectId = effectId;
    if (effectId === 'fool_dealer_weak') {
      this.dealerStandThreshold = 15;
    }
  }

  activateMoon(): void {
    this.moonActive = true;
  }

    setDealerDifficulty(floor: number): void {
    if (floor <= 5) this.dealerStandThreshold = 17;      // 1: обычный
    else if (floor <= 10) this.dealerStandThreshold = 18; // 2: сложнее
    else if (floor <= 15) this.dealerStandThreshold = 19; // 3: хардкор
    else this.dealerStandThreshold = 20;                  // 4+: эксперт
  }

  isMoonActive(): boolean {
    return this.moonActive;
  }

  getFoolEffectId(): string | null {
    return this.foolEffectId;
  }

  deal(): void {
    if (this.state.state !== 'betting') {
      throw new Error('Сначала нужно сделать ставку');
    }

    if (this.foolEffectId === 'fool_auto_win') {
      const playerHand: Card[] = [this.deck.draw(), this.deck.draw()];
      const dealerHand: Card[] = [this.deck.draw(), this.deck.draw()];
      this.state = {
        state: 'gameOver',
        result: 'playerWin',
        playerHands: [playerHand],
        dealerHand,
        bets: [this.bet],
        splitAces: false,
        insuranceBet: 0
      };
      return;
    }

    this.deck.shuffle();
    const playerHand: Card[] = [this.deck.draw(), this.deck.draw()];
    const dealerHand: Card[] = [this.deck.draw(), this.deck.draw()];

    const playerHasBlackjack = isBlackjack(playerHand);
    const dealerHasBlackjack = isBlackjack(dealerHand);
    const dealerVisibleCard = dealerHand[0];

    if (playerHasBlackjack && dealerHasBlackjack) {
      this.state = {
        state: 'gameOver',
        result: 'push',
        playerHands: [playerHand],
        dealerHand,
        bets: [this.bet],
        splitAces: false,
        insuranceBet: 0
      };
      return;
    }

    if (playerHasBlackjack && !dealerHasBlackjack) {
      this.state = {
        state: 'gameOver',
        result: 'blackjack',
        playerHands: [playerHand],
        dealerHand,
        bets: [this.bet],
        splitAces: false,
        insuranceBet: 0
      };
      return;
    }

    if (dealerHasBlackjack && dealerVisibleCard.rank !== 'A') {
      this.state = {
        state: 'gameOver',
        result: 'dealerWin',
        playerHands: [playerHand],
        dealerHand,
        bets: [this.bet],
        splitAces: false,
        insuranceBet: 0
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
    const dealingState = this.state;
    const dealerVisibleCard = dealingState.dealerHand[0];
    const insuranceAvailable = dealerVisibleCard.rank === 'A';

    this.state = {
      state: 'playerTurn',
      playerHands: [dealingState.playerHand],
      currentHandIndex: 0,
      dealerHand: dealingState.dealerHand,
      dealerVisibleCard,
      bets: [this.bet],
      splitAces: false,
      insuranceAvailable,
      insuranceBet: 0
    };
  }

  hit(): void {
    if (this.state.state !== 'playerTurn') {
      throw new Error('Сейчас не ход игрока');
    }
    const playerState = this.state;
    const idx = playerState.currentHandIndex;
    const currentHand = playerState.playerHands[idx];
    if (playerState.splitAces) {
      throw new Error('После разделения тузов нельзя брать карты');
    }
    const newCard = this.deck.draw();
    this.lastDrawnCard = newCard;
    const newHand = [...currentHand, newCard];
    const newHands = [...playerState.playerHands];
    newHands[idx] = newHand;
    if (isBust(newHand)) {
      if (idx === playerState.playerHands.length - 1) {
        this.state = {
          state: 'dealerTurn',
          playerHands: newHands,
          dealerHand: playerState.dealerHand,
          bets: playerState.bets,
          splitAces: playerState.splitAces,
          insuranceBet: playerState.insuranceBet
        };
        this.dealerPlay(playerState.dealerHand);
      } else {
        this.state = { ...playerState, playerHands: newHands, currentHandIndex: idx + 1 };
      }
      return;
    }
    this.state = { ...playerState, playerHands: newHands };
  }

  stand(): void {
    if (this.state.state !== 'playerTurn') {
      throw new Error('Сейчас не ход игрока');
    }
    const playerState = this.state;
    const idx = playerState.currentHandIndex;
    if (idx === playerState.playerHands.length - 1) {
      this.state = {
        state: 'dealerTurn',
        playerHands: playerState.playerHands,
        dealerHand: playerState.dealerHand,
        bets: playerState.bets,
        splitAces: playerState.splitAces,
        insuranceBet: playerState.insuranceBet
      };
      this.dealerPlay(playerState.dealerHand);
    } else {
      this.state = { ...playerState, currentHandIndex: idx + 1 };
    }
  }

  double(): void {
    if (this.state.state !== 'playerTurn') {
      throw new Error('Сейчас не ход игрока');
    }
    const playerState = this.state;
    const idx = playerState.currentHandIndex;
    const currentHand = playerState.playerHands[idx];
    if (currentHand.length !== 2) {
      throw new Error('Можно удваивать только на первых двух картах');
    }
    if (playerState.splitAces) {
      throw new Error('После разделения тузов нельзя удваивать');
    }
    const currentBet = playerState.bets[idx];
    if (this.balance < currentBet) {
      throw new Error('Недостаточно средств для удвоения');
    }
    const newBets = [...playerState.bets];
    newBets[idx] = currentBet * 2;
    this.balance -= currentBet;
    const newCard = this.deck.draw();
    this.lastDrawnCard = newCard;
    const newHand = [...currentHand, newCard];
    const newHands = [...playerState.playerHands];
    newHands[idx] = newHand;
    if (isBust(newHand)) {
      if (idx === playerState.playerHands.length - 1) {
        this.state = {
          state: 'dealerTurn',
          playerHands: newHands,
          dealerHand: playerState.dealerHand,
          bets: newBets,
          splitAces: playerState.splitAces,
          insuranceBet: playerState.insuranceBet
        };
        this.dealerPlay(playerState.dealerHand);
      } else {
        this.state = { ...playerState, playerHands: newHands, bets: newBets, currentHandIndex: idx + 1 };
      }
      return;
    }
    if (idx === playerState.playerHands.length - 1) {
      this.state = {
        state: 'dealerTurn',
        playerHands: newHands,
        dealerHand: playerState.dealerHand,
        bets: newBets,
        splitAces: playerState.splitAces,
        insuranceBet: playerState.insuranceBet
      };
      this.dealerPlay(playerState.dealerHand);
    } else {
      this.state = { ...playerState, playerHands: newHands, bets: newBets, currentHandIndex: idx + 1 };
    }
  }

  split(): void {
    if (this.state.state !== 'playerTurn') {
      throw new Error('Сейчас не ход игрока');
    }
    const playerState = this.state;
    const idx = playerState.currentHandIndex;
    const currentHand = playerState.playerHands[idx];
    if (currentHand.length !== 2) {
      throw new Error('Можно разделить только руку из двух карт');
    }
    if (currentHand[0].rank !== currentHand[1].rank) {
      throw new Error('Можно разделить только одинаковые карты');
    }
    if (playerState.playerHands.length > 1) {
      throw new Error('Повторное разделение запрещено');
    }
    const currentBet = playerState.bets[idx];
    if (this.balance < currentBet) {
      throw new Error('Недостаточно средств для разделения');
    }
    const isAces = currentHand[0].rank === 'A';
    const hand1: Card[] = [currentHand[0]];
    const hand2: Card[] = [currentHand[1]];
    const newHands: Card[][] = [hand1, hand2];
    const newBets = [currentBet, currentBet];
    this.balance -= currentBet;
    if (isAces) {
      hand1.push(this.deck.draw());
      hand2.push(this.deck.draw());
      this.state = {
        state: 'dealerTurn',
        playerHands: newHands,
        dealerHand: playerState.dealerHand,
        bets: newBets,
        splitAces: true,
        insuranceBet: playerState.insuranceBet
      };
      this.dealerPlay(playerState.dealerHand);
      return;
    }
    hand1.push(this.deck.draw());
    hand2.push(this.deck.draw());
    this.state = {
      ...playerState,
      playerHands: newHands,
      currentHandIndex: 0,
      bets: newBets,
      splitAces: false
    };
  }

  insurance(): void {
    if (this.state.state !== 'playerTurn') {
      throw new Error('Сейчас не ход игрока');
    }
    const playerState = this.state;
    if (!playerState.insuranceAvailable) {
      throw new Error('Страховка недоступна — у дилера не туз');
    }
    if (playerState.insuranceBet > 0) {
      throw new Error('Страховка уже взята');
    }
    const currentHand = playerState.playerHands[playerState.currentHandIndex];
    if (currentHand.length !== 2) {
      throw new Error('Страховку можно взять только в начале раздачи');
    }
    const insuranceAmount = Math.floor(playerState.bets[0] / 2);
    if (this.balance < insuranceAmount) {
      throw new Error('Недостаточно средств для страховки');
    }
    this.balance -= insuranceAmount;
    const dealerHasBlackjack = isBlackjack(playerState.dealerHand);
    if (dealerHasBlackjack) {
      this.state = {
        state: 'gameOver',
        result: 'dealerWin',
        playerHands: playerState.playerHands,
        dealerHand: playerState.dealerHand,
        bets: playerState.bets,
        splitAces: playerState.splitAces,
        insuranceBet: insuranceAmount
      };
      return;
    }
    this.state = { ...playerState, insuranceBet: insuranceAmount };
  }

  getTotalStake(): number {
    if (
      this.state.state === 'playerTurn' ||
      this.state.state === 'dealerTurn' ||
      this.state.state === 'gameOver'
    ) {
      const state = this.state;
      const betsSum = state.bets.reduce((sum, bet) => sum + bet, 0);
      const insuranceBet = state.insuranceBet ?? 0;
      return betsSum + insuranceBet;
    }
    return this.bet;
  }

  private dealerPlay(initialDealerHand: Card[]): void {
    let dealerHand = [...initialDealerHand];
    while (calculateHandScore(dealerHand).total < this.dealerStandThreshold) {
      dealerHand = [...dealerHand, this.deck.draw()];
    }
    // Башня: только если у дилера ровно threshold
    if (this.perks.includes('the_tower') && !this.towerApplied) {
      const dealerScore = calculateHandScore(dealerHand).total;
      if (dealerScore === this.dealerStandThreshold) {
        dealerHand = [...dealerHand, this.deck.draw()];
        this.towerApplied = true;
        }
      }
    this.determineWinner(dealerHand);
  }

  private determineWinner(dealerHand: Card[]): void {
    if (this.state.state !== 'dealerTurn') {
      throw new Error('Нельзя определить победителя сейчас');
    }
    const playerState = this.state;
    const playerHands = playerState.playerHands;
    const dealerScore = calculateHandScore(dealerHand).total;
    const dealerHasBlackjack = isBlackjack(dealerHand);
    const splitAces = playerState.splitAces ?? false;

    let playerWins = 0;
    let pushes = 0;
    let losses = 0;
    let hasBlackjack = false;

    for (let i = 0; i < playerHands.length; i++) {
      const hand = playerHands[i];
      const playerScore = calculateHandScore(hand).total;
      const playerHasBlackjack = isBlackjack(hand) && !splitAces;
      if (playerScore > 21) {
        losses++;
        continue;
      }
      if (dealerHasBlackjack) {
        if (playerHasBlackjack) {
          pushes++;
        } else {
          losses++;
        }
      } else if (playerHasBlackjack) {
        hasBlackjack = true;
        playerWins++;
      } else if (dealerScore > 21) {
        playerWins++;
      } else if (playerScore > dealerScore) {
        playerWins++;
      } else if (playerScore < dealerScore) {
        losses++;
      } else {
        pushes++;
      }
    }

    let finalResult: GameResult;
    if (hasBlackjack && playerWins === playerHands.length) {
      finalResult = 'blackjack';
    } else if (playerWins > losses) {
      finalResult = 'playerWin';
    } else if (losses > playerWins) {
      if (this.perks.includes('the_hanged_man') && !this.hangedManUsed) {
        finalResult = 'push';
        this.hangedManUsed = true;
      } else {
        finalResult = 'dealerWin';
      }
    } else {
      finalResult = 'push';
    }

    this.state = {
      state: 'gameOver',
      result: finalResult,
      playerHands: playerHands,
      dealerHand: dealerHand,
      bets: playerState.bets,
      splitAces: splitAces,
      insuranceBet: playerState.insuranceBet ?? 0
    };
  }

  getState(): GameState {
    return this.state;
  }

  getPayout(): number {
    if (this.state.state !== 'gameOver') {
      return 0;
    }
    const gameOverState = this.state;
    const dealerHand = gameOverState.dealerHand;
    const dealerHasBlackjack = isBlackjack(dealerHand);
    const dealerScore = calculateHandScore(dealerHand).total;
    const splitAces = gameOverState.splitAces ?? false;

    let totalPayout = 0;

    for (let i = 0; i < gameOverState.playerHands.length; i++) {
      const hand = gameOverState.playerHands[i];
      let bet = gameOverState.bets[i];
      const playerScore = calculateHandScore(hand).total;
      const playerHasBlackjack = isBlackjack(hand) && !splitAces;

      if (playerScore > 21) {
        continue;
      }

      if (this.foolEffectId === 'fool_double_payout') {
        bet = bet * 2;
      }

      if (playerHasBlackjack && !dealerHasBlackjack) {
        totalPayout += Math.floor(bet * 2.5);
      } else if (dealerHasBlackjack) {
        if (playerHasBlackjack) {
          totalPayout += bet;
        }
      } else if (dealerScore > 21 || playerScore > dealerScore) {
        totalPayout += bet * 2;
      } else if (playerScore === dealerScore) {
        totalPayout += bet;
      }
    }

    if (gameOverState.insuranceBet && dealerHasBlackjack) {
      totalPayout += gameOverState.insuranceBet * 3;
    }

    return totalPayout;
  }

  reroll(): boolean {
    if (this.state.state !== 'dealing' && this.state.state !== 'playerTurn') {
      return false;
    }
    if (!this.perks.includes('death')) {
      return false;
    }
    this.deck.shuffle();
    const playerHand: Card[] = [this.deck.draw(), this.deck.draw()];
    const dealerHand: Card[] = [this.deck.draw(), this.deck.draw()];
    if (this.state.state === 'dealing') {
      this.state = { state: 'dealing', playerHand, dealerHand };
    } else {
      const playerState = this.state as any;
      this.state = {
        ...playerState,
        playerHands: [playerHand],
        currentHandIndex: 0,
        bets: [this.bet],
        splitAces: false,
        insuranceBet: 0,
        dealerHand
      };
    }
    return true;
  }

  wheel(): boolean {
    if (this.state.state !== 'playerTurn') {
      return false;
    }
    if (!this.perks.includes('the_wheel') || this.wheelUsed) {
      return false;
    }
    this.deck.shuffle();
    const playerHand: Card[] = [this.deck.draw(), this.deck.draw()];
    const dealerHand: Card[] = [this.deck.draw(), this.deck.draw()];
    const playerState = this.state as any;
    this.state = {
      ...playerState,
      playerHands: [playerHand],
      currentHandIndex: 0,
      bets: [this.bet],
      splitAces: false,
      insuranceBet: 0,
      dealerHand
    };
    this.wheelUsed = true;
    this.lastDrawnCard = null;
    return true;
  }

  peekNextCard(): Card | null {
    if (!this.perks.includes('the_moon')) {
      return null;
    }
    return this.deck.peek();
  }

  getLastDrawnCard(): Card | null {
    return this.lastDrawnCard;
  }

  hasPerk(perkId: string): boolean {
    return this.perks.includes(perkId);
  }

  isTowerApplied(): boolean {
    return this.towerApplied;
  }

  isWheelUsed(): boolean {
    return this.wheelUsed;
  }

  isHangedManUsed(): boolean {
    return this.hangedManUsed;
  }

  getDeckRemaining(): number {
    return this.deck.remaining();
  }

  reset(): void {
    this.state = { state: 'idle' };
    this.bet = 0;
    this.balance = 0;
    this.perks = [];
    this.towerApplied = false;
    this.wheelUsed = false;
    this.hangedManUsed = false;
    this.foolEffectId = null;
    this.moonActive = false;
    this.lastDrawnCard = null;
    this.deck.reset();
    this.dealerStandThreshold = 17;
  }
}