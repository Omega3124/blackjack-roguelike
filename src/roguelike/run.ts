export interface RunState {
  runNumber: number;
  currentFloor: number;
  maxFloors: number;
  hp: number;
  maxHp: number;
  perks: string[];
  usedPerks: string[];
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
      usedPerks: [],
      bossDefeated: [false, false, false, false, false],
      gamesPlayed: 0,
      gamesWon: 0,
      status: 'active'
    };
  }

  getState(): RunState {
    return this.state;
  }

  startNewRun(): void {
    this.state = this.createNewRun();
  }

  loadRun(state: RunState): void {
    this.state = state;
  }

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

  increaseMaxHp(amount: number): void {
    this.state.maxHp += amount;
    this.state.hp += amount;
  }

  advanceFloor(): void {
    this.state.currentFloor++;
    
    if (this.state.currentFloor > this.state.maxFloors) {
      this.state.status = 'completed';
    }
  }

  addPerk(perkId: string): void {
    // Максимум 2 активных перка
    if (this.state.perks.length >= 2) {
      this.state.perks.shift(); // удаляем самый старый
    }
    if (!this.state.perks.includes(perkId)) {
      this.state.perks.push(perkId);
    }
  }

  usePerk(perkId: string): boolean {
    if (this.state.usedPerks.includes(perkId)) {
      return false; // уже использован
    }
    this.state.usedPerks.push(perkId);
    return true;
  }

  isPerkUsed(perkId: string): boolean {
    return this.state.usedPerks.includes(perkId);
  }

  isRunActive(): boolean {
    return this.state.status === 'active';
  }

  getCurrentFloor(): number {
    return this.state.currentFloor;
  }

  getHp(): number {
    return this.state.hp;
  }

  getMaxHp(): number {
    return this.state.maxHp;
  }

  getPerks(): string[] {
    return this.state.perks;
  }

  exportState(): RunState {
    return { ...this.state };
  }
}

export function createRunManager(): RunManager {
  return new RunManager();
}