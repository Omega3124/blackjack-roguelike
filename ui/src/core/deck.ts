import {Card, Suit, Rank} from './types.js';
import { SeededRNG } from './rng.js';

export class Deck{
    private cards: Card[];
    private rng: SeededRNG;
    constructor(seed: string | number = Date.now()){
        this.rng = new SeededRNG(seed);
        this.cards = this.createDeck();
    }
    private createDeck(): Card[] {
        const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10',
      'J', 'Q', 'K'];
      const deck: Card[] = [];
      for(const suit of suits){
        for(const rank of ranks){
            deck.push({suit, rank});
        }
      }
      return deck;
    }
    shuffle(): void {
        this.cards = this.rng.shuffle(this.cards);
    }
        remaining(): number {
        return this.cards.length;
    }
        reset(): void{
        this.cards = this.createDeck();
        this.shuffle();
    }
    draw(): Card{
        if(this.cards.length === 0){
            throw new Error('Колода пуста!');
        }
        const card = this.cards.pop();
        if(!card) {
            throw new Error('Ошибка при извлечении карты');
        }
                if (this.remaining() < 15) {
            this.reset();
        }
        return card;
    }
}