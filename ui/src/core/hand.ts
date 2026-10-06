import {Card, Rank} from './types.js';
function cardValue(rank: Rank): number {
    if(rank === 'A') return 11;
    if(rank ==='K' || rank ==='Q' || rank === 'J') return 10;
    return parseInt(rank, 10);
}

export interface HandScore {
    readonly total: number;
    readonly isSoft: boolean;
    readonly isBust: boolean;
}
export function calculateHandScore(cards: readonly Card[]) : HandScore{
    let total = 0;
    let aceCount = 0;
    for(const card of cards){
        if(card.rank === 'A'){
            aceCount++;
            total+=11;
        }
        else{
            total += cardValue(card.rank);
        }
    }
    let isSoft = false;
    while(total > 21 && aceCount > 0)
    {
        total -=10;
        aceCount--;
    }
    if(aceCount > 0){
        isSoft = true;
    }
   return {
    total,
    isSoft,
    isBust: total >21
   };
}
export function isBlackjack(cards: readonly Card[]): boolean {
    if(cards.length !==2) return false;
    const score = calculateHandScore(cards);
    return score.total ===21;
}
export function isBust(cards: readonly Card[]): boolean{
    return calculateHandScore(cards).isBust;
}