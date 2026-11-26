export interface Perk {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'visual' | 'information' | 'mechanic' | 'chaos';
}

export const FOOL_EFFECTS = [
  { id: 'fool_heal', name: 'Исцеление', description: '+10 HP', icon: '💚' },
  { id: 'fool_curse', name: 'Проклятие', description: '-10 HP', icon: '💔' },
  { id: 'fool_max_hp', name: 'Стойкость', description: '+10 к макс. HP', icon: '🛡️' },
  { id: 'fool_free_bet', name: 'Бесплатная игра', description: 'Следующий проигрыш без потери HP', icon: '🎁' },
  { id: 'fool_double_payout', name: 'Удвоение', description: 'Следующая выплата удваивается', icon: '✨' },
  { id: 'fool_auto_win', name: 'Удача', description: 'Следующая игра — автоматическая победа', icon: '🍀' },
  { id: 'fool_dealer_weak', name: 'Слабый дилер', description: 'Дилер встаёт на 15', icon: '😴' },
];

export const TAROT_PERKS: Perk[] = [
  { id: 'the_fool', name: 'Шут', description: 'Случайный эффект (7 вариантов)', icon: '🃏', type: 'visual' },
  { id: 'the_magician', name: 'Маг', description: 'Подсмотреть скрытую карту дилера', icon: '🎩', type: 'information' },
  { id: 'the_tower', name: 'Башня', description: 'Дилер берёт +1 карту при 17 (1×/локация)', icon: '🗼', type: 'mechanic' },
  { id: 'the_sun', name: 'Солнце', description: '+5 max HP при переборе дилера', icon: '☀️', type: 'mechanic' },
  { id: 'death', name: 'Смерть', description: 'Пересдать карты (1×/локация)', icon: '💀', type: 'mechanic' },
  { id: 'the_moon', name: 'Луна', description: 'Следующая ставка ×2', icon: '🌙', type: 'information' },
  { id: 'justice', name: 'Справедливость', description: 'При проигрыше теряешь на 5 HP меньше (мин. -5)', icon: '⚖️', type: 'mechanic' },
  { id: 'the_wheel', name: 'Колесо Фортуны', description: 'Заменить карты + перетасовать (1×/локация)', icon: '🎡', type: 'chaos' },
  { id: 'the_hanged_man', name: 'Повешенный', description: 'Поражение → ничья (1×/локация)', icon: '🙃', type: 'mechanic' },
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