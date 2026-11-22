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
    description: 'Подсмотреть скрытую карту дилера до принятия решения',
    icon: '🎩',
    type: 'information'
  },
  {
    id: 'the_tower',
    name: 'Башня',
    description: '1 раз за забег: если у дилера 17, он обязан взять ещё карту',
    icon: '🗼',
    type: 'mechanic'
  },
  {
    id: 'the_sun',
    name: 'Солнце',
    description: '1 раз за забег: если проиграл, HP не теряется (ставка возвращается)',
    icon: '☀️',
    type: 'mechanic'
  },
  {
    id: 'death',
    name: 'Смерть',
    description: '1 раз за забег: пересдать карты в начале раздачи',
    icon: '💀',
    type: 'mechanic'
  },
  {
    id: 'the_moon',
    name: 'Луна',
    description: 'Видеть верхнюю карту колоды перед ходом',
    icon: '🌙',
    type: 'information'
  },
  {
    id: 'justice',
    name: 'Справедливость',
    description: 'При ничьей: ставка возвращается + получить +2 HP',
    icon: '⚖️',
    type: 'mechanic'
  },
  {
    id: 'the_wheel',
    name: 'Колесо Фортуны',
    description: 'Меняет карты игрока и дилера на случайные + перетасовка',
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