export interface Perk {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'visual' | 'information' | 'mechanic' | 'chaos';
}

export const TAROT_PERKS: Perk[] = [
  {
    id: 'the_fool',
    name: 'Шут',
    description: 'Меняет визуальное отображение открытой карты на случайную (блеф)',
    icon: '🃏',
    type: 'visual'
  },
  {
    id: 'the_magician',
    name: 'Маг',
    description: 'Подсмотреть скрытую карту дилера',
    icon: '🎩',
    type: 'information'
  },
  {
    id: 'the_tower',
    name: 'Башня',
    description: 'Принудительно заставить дилера взять ещё одну карту',
    icon: '🗼',
    type: 'mechanic'
  },
  {
    id: 'the_sun',
    name: 'Солнце',
    description: 'Blackjack платит 4:1 вместо 3:2',
    icon: '☀️',
    type: 'mechanic'
  },
  {
    id: 'death',
    name: 'Смерть',
    description: '1 раз за забег можно пересдать карты',
    icon: '💀',
    type: 'mechanic'
  },
  {
    id: 'the_moon',
    name: 'Луна',
    description: 'Подсмотреть верхнюю карту в колоде',
    icon: '🌙',
    type: 'information'
  },
  {
    id: 'justice',
    name: 'Справедливость',
    description: 'Ничья = победа игрока',
    icon: '⚖️',
    type: 'mechanic'
  },
  {
    id: 'the_wheel',
    name: 'Колесо Фортуны',
    description: 'Меняет карты игрока и дилера на случайные + перетасовка колоды',
    icon: '🎡',
    type: 'chaos'
  }
];

export function getRandomPerks(count: number = 3): Perk[] {
  const shuffled = [...TAROT_PERKS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getPerkById(id: string): Perk | undefined {
  return TAROT_PERKS.find(p => p.id === id);
}