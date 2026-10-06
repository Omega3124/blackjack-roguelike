import seedrandom from 'seedrandom';

export class SeededRNG{
    private rng: seedrandom.PRNG;
    constructor(seed: string | number)
    {
        this.rng = seedrandom(String(seed));
    }
    random(): number {
        return this.rng();
    }
    randomInt(min: number, max: number): number{
        return Math.floor(this.rng() * (max - min +1)) + min;
    }
    shuffle<T>(array: readonly T[]): T[]{
        const result = [...array];
        for (let i = result.length -1 ; i>0; i--){
            const j = this.randomInt(0, i);
            [result[i], result[j]] = [result[j], result[i]];

        }
        return result;
    }
    randomElement<T>(array: readonly T[]): T{
        return array[this.randomInt(0, array.length - 1)];
    }
}

