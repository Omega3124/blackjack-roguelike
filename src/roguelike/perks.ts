export interface Perk {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'mechanic';
}

export const FOOL_EFFECTS = [
  { id: 'fool_heal', name: 'Исцеление', description: '+10 HP', icon: '💚' },
  { id: 'fool_curse', name: 'Проклятие', description: '-10 HP', icon: '💔' },
  { id: 'fool_max_hp', name: 'Стойкость', description: '+10 HP лечения', icon: '🛡️' },
  { id: 'fool_free_bet', name: 'Бесплатная игра', description: 'Следующий проигрыш без потери HP', icon: '🎁' },
  { id: 'fool_double_payout', name: 'Удвоение', description: 'Следующая выплата удваивается', icon: '✨' },
  { id: 'fool_auto_win', name: 'Удача', description: 'Следующая игра — автоматическая победа', icon: '🍀' },
  { id: 'fool_dealer_weak', name: 'Слабый дилер', description: 'Дилер в следующей игре встаёт на 15', icon: '😴' },
];

export const TAROT_PERKS: Perk[] = [
  {
    id: 'the_tower',
    name: 'Башня',
    description: '1 раз за локацию: дилер обязан взять +1 карту при 17',
    icon: '🗼',
    type: 'mechanic'
  },
  {
    id: 'the_sun',
    name: 'Солнце',
    description: 'При переборе дилера (>21): +5 к макс. HP',
    icon: '☀️',
    type: 'mechanic'
  },
  {
    id: 'death',
    name: 'Смерть',
    description: '1 раз за локацию: пересдать карты в начале раздачи',
    icon: '💀',
    type: 'mechanic'
  },
  {
    id: 'justice',
    name: 'Справедливость',
    description: 'При проигрыше: теряешь на 5 HP меньше (минимум -5)',
    icon: '⚖️',
    type: 'mechanic'
  },
  {
    id: 'the_wheel',
    name: 'Колесо Фортуны',
    description: '1 раз за локацию: заменить все карты + перетасовать колоду',
    icon: '🎡',
    type: 'mechanic'
  },
  {
    id: 'the_fool',
    name: 'Шут',
    description: '??? (случайный эффект, сгорает после применения)',
    icon: '❓',
    type: 'mechanic'
  },
  {
    id: 'the_hanged_man',
    name: 'Повешенный',
    description: '1 раз за локацию: отразить следующее поражение → ничья',
    icon: '🙃',
    type: 'mechanic'
  },
  {
    id: 'the_moon',
    name: 'Луна',
    description: 'Следующая игра: ставки удваиваются (и выигрыш, и проигрыш)',
    icon: '🌙',
    type: 'mechanic'
  }
];

export function getRandomPerks(count: number = 3): Perk[] {
  const shuffled = [...TAROT_PERKS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getPerkById(id: string): Perk | undefined {
  return TAROT_PERKS.find(p => p.id === id);
}

export function getRandomFoolEffect() {
  return FOOL_EFFECTS[Math.floor(Math.random() * FOOL_EFFECTS.length)];
}