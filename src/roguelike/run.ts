export interface RunState {
  runNumber: number;
  currentFloor: number;
  maxFloors: number;
  hp: number;
  maxHp: number;
  perks: string[];
  bossDefeated: boolean[];
  gamesPlayed: number;
  gamesWon: number;
  status: 'active' | 'completed' | 'failed';
}

export class RunManager {
  private state: RunState;

  constructor() {
    this.state = this.createNewRun();
  }

  private createNewRun(): RunState {
    return {
      runNumber: 1,
      currentFloor: 1,
      maxFloors: 5,
      hp: 100,
      maxHp: 100,
      perks: [],
      bossDefeated: [false, false, false, false, false],
      gamesPlayed: 0,
      gamesWon: 0,
      status: 'active'
    };
  }

  getState(): RunState {
    return this.state;
  }

  /**
   * Заготовки рогалика
   */
  startNewRun(): void {
    this.state = this.createNewRun();
  }

  /**
   * Продолжить забег
   */
  loadRun(state: RunState): void {
    this.state = state;
  }

  /**
   * Обновить HP после игры
   */
  updateHp(hpChange: number): void {
    this.state.hp = Math.max(0, Math.min(this.state.maxHp, this.state.hp + hpChange));
    this.state.gamesPlayed++;
    
    if (hpChange > 0) {
      this.state.gamesWon++;
    }

    if (this.state.hp <= 0) {
      this.state.status = 'failed';
    }
  }

  /**
   * Перейти на следующий этаж/уровень/локация
   */
  advanceFloor(): void {
    this.state.currentFloor++;
    
    if (this.state.currentFloor > this.state.maxFloors) {
      this.state.status = 'completed';
    }
  }

  /**
   * Добавить перк (возможно)
   */
  addPerk(perkId: string): void {
    if (!this.state.perks.includes(perkId)) {
      this.state.perks.push(perkId);
    }
  }

  /**
   * Проверить, активен ли забег
   */
  isRunActive(): boolean {
    return this.state.status === 'active';
  }

  /**
   * Получить текущий этаж/уровень/локацию
   */
  getCurrentFloor(): number {
    return this.state.currentFloor;
  }

  /**
   * Получить HP
   */
  getHp(): number {
    return this.state.hp;
  }

  /**
   * Получить максимальный HP
   */
  getMaxHp(): number {
    return this.state.maxHp;
  }

  /**
   * Получить список перков
   */
  getPerks(): string[] {
    return this.state.perks;
  }

  /**
   * Экспортировать состояние для сохранения
   */
  exportState(): RunState {
    return { ...this.state };
  }
}

export function createRunManager(): RunManager {
  return new RunManager();
}