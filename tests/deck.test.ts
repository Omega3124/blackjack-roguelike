import { describe, it, expect } from 'vitest';
import { Deck } from '../src/core/deck.js';
describe('Deck', () => {it('full deck of 52 cards?', () =>{ const deck = new Deck('test-seed'); 
    expect(deck.remaining()).toBe(52);
} )
it('should draw cards from the deck', () => {
    const deck = new Deck('test-seed');
    deck.shuffle();

    const card = deck.draw();
    expect(card).toHaveProperty('suit');
    expect(card).toHaveProperty('rank');
    expect(deck.remaining()).toBe(51);
});
it('should throw error when deck is empty', ()=> {
    const deck = new Deck('Empty-test')
    for(let i = 0; i<52; i++){
        deck.draw();
    }
    expect(() => deck.draw()).toThrow('Колода пуста!');

});
it('should produce same sequence with same seed', () => {
    const deck1 = new Deck('same-seed');
    const deck2 = new Deck('same-seed');
    
    deck1.shuffle();
    deck2.shuffle();

    const cards1 = [deck1.draw(), deck1.draw(), deck1.draw()]
    const cards2 = [deck2.draw(), deck2.draw(), deck2.draw()]
    
    expect(cards1[0].rank).toBe(cards2[0].rank);
    expect(cards1[0].suit).toBe(cards2[0].suit);
    expect(cards1[1].rank).toBe(cards2[1].rank);
    expect(cards1[2].rank).toBe(cards2[2].rank);
})
});