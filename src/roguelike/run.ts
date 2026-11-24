export interface RunState {
  runNumber: number;
  currentFloor: number;
  floorsPerLocation: number;
  hp: number;
  maxHp: number;
  perks: string[];
  usedPerks: string[];
  gamesPlayed: number;
  gamesWon: number;
  status: 'active' | 'failed';
  foolEffectId: string | null;
  moonActive: boolean;
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
      floorsPerLocation: 5,
      hp: 50,
      maxHp: 50,
      perks: [],
      usedPerks: [],
      gamesPlayed: 0,
      gamesWon: 0,
      status: 'active',
      foolEffectId: null,
      moonActive: false
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

  getCurrentLocation(): number {
    return Math.floor((this.state.currentFloor - 1) / this.state.floorsPerLocation) + 1;
  }

  isNewLocation(): boolean {
    const f = this.state.currentFloor;
    return f > 1 && (f - 1) % this.state.floorsPerLocation === 0;
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

  heal(amount: number): void {
    this.state.hp = Math.min(this.state.maxHp, this.state.hp + amount);
  }

  increaseMaxHp(amount: number): void {
    const maxAllowed = 150;
    if (this.state.maxHp < maxAllowed) {
      const actualAmount = Math.min(amount, maxAllowed - this.state.maxHp);
      this.state.maxHp += actualAmount;
      this.state.hp += actualAmount;
    }
  }

  onNewLocation(): void {
    this.state.hp = Math.min(this.state.maxHp, this.state.hp + 10);
    this.state.usedPerks = [];
  }

  advanceFloor(): void {
    this.state.currentFloor++;
  }

  addPerk(perkId: string): void {
    if (this.state.perks.length >= 2) {
      this.state.perks.shift();
    }
    if (!this.state.perks.includes(perkId)) {
      this.state.perks.push(perkId);
    }
  }

  usePerk(perkId: string): boolean {
    if (this.state.usedPerks.includes(perkId)) {
      return false;
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

  setFoolEffect(effectId: string | null): void {
    this.state.foolEffectId = effectId;
  }

  getFoolEffect(): string | null {
    return this.state.foolEffectId;
  }

  setMoonActive(active: boolean): void {
    this.state.moonActive = active;
  }

  isMoonActive(): boolean {
    return this.state.moonActive;
  }

  exportState(): RunState {
    return { ...this.state };
  }
}

export function createRunManager(): RunManager {
  return new RunManager();
}