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
  private readonly locationsTotal = 3;

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
      moonActive: false,
    };
  }

  startNewRun(): void {
    this.state = this.createNewRun();
  }

  loadRun(state: RunState): void {
    this.state = state;
  }

  getTotalFloors(): number {
    return this.state.floorsPerLocation * this.locationsTotal;
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

  heal(a: number): void {
    this.state.hp = Math.min(this.state.maxHp, this.state.hp + a);
  }

  increaseMaxHp(a: number): void {
    const cap = 150;
    if (this.state.maxHp < cap) {
      const d = Math.min(a, cap - this.state.maxHp);
      this.state.maxHp += d;
      this.state.hp += d;
    }
  }

  onNewLocation(): void {
    this.state.hp = Math.min(this.state.maxHp, this.state.hp + 10);
    this.state.usedPerks = [];
  }

  advanceFloor(): void {
    this.state.currentFloor++;
  }

  addPerk(id: string): void {
    if (this.state.perks.length >= 2) {
      this.state.perks.shift();
    }
    if (!this.state.perks.includes(id)) {
      this.state.perks.push(id);
    }
  }

  removePerk(id: string): void {
    this.state.perks = this.state.perks.filter(p => p !== id);
  }

  usePerk(id: string): boolean {
    if (this.state.usedPerks.includes(id)) return false;
    this.state.usedPerks.push(id);
    return true;
  }

  isPerkUsed(id: string): boolean {
    return this.state.usedPerks.includes(id);
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

  setFoolEffect(id: string | null): void {
    this.state.foolEffectId = id;
  }

  getFoolEffect(): string | null {
    return this.state.foolEffectId;
  }

  setMoonActive(v: boolean): void {
    this.state.moonActive = v;
  }

  isMoonActive(): boolean {
    return this.state.moonActive;
  }

  getState(): RunState {
    return this.state;
  }

  exportState(): RunState {
    return { ...this.state };
  }
}

export function createRunManager(): RunManager {
  return new RunManager();
}