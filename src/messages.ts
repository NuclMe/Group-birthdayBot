import type { Birthday } from './types.js';

const monthNames = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export function displayName(record: Birthday): string {
  return record.username ? `@${record.username}` : record.name;
}

export function monthlyMessage(records: Birthday[], month: number): string {
  if (!records.length) return `В ${monthNames[month - 1]} дней рождения нет.`;
  const lines = records.map(
    (record) =>
      `${String(record.birthdayDay).padStart(2, '0')} ${monthNames[month - 1]} — ${displayName(record)}`,
  );
  return `Дни рождения в ${monthNames[month - 1]}:\n\n${lines.join('\n')}`;
}

export function birthdayMessage(record: Birthday): string {
  return `Поздравляем с днем народження, ${displayName(record)}! 🎉\nЖелаем счастья, здоровья и исполнения желаний!`;
}
