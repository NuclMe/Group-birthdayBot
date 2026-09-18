import 'dotenv/config';
import type { AppConfig } from './types.js';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function numberValue(name: string): number {
  const value = Number(required(name));
  if (!Number.isInteger(value)) throw new Error(`${name} must be an integer`);
  return value;
}

export function loadConfig(): AppConfig {
  return {
    botToken: required('BOT_TOKEN'),
    mongoUri: required('MONGODB_URI'),
    mongoDatabase: process.env.MONGODB_DATABASE?.trim() || 'birthday_bot',
    targetChatId: required('TARGET_CHAT_ID'),
    ownerTelegramId: numberValue('OWNER_TELEGRAM_ID'),
    timezone: process.env.TIMEZONE?.trim() || 'Europe/Kyiv',
    monthlySummaryHour: Number(process.env.MONTHLY_SUMMARY_HOUR || 9),
    birthdayMessageHour: Number(process.env.BIRTHDAY_MESSAGE_HOUR || 10),
  };
}
