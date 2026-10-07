import { Bot, type Context } from 'grammy';
import type { Database } from './database.js';
import { parseExcel } from './excel.js';
import { birthdayMessage, monthlyMessage } from './messages.js';
import { sendTestBirthdays, sendTestMonth } from './scheduler.js';
import type { AppConfig } from './types.js';

function isOwner(ctx: Context, config: AppConfig): boolean {
  return ctx.from?.id === config.ownerTelegramId;
}

const TELEGRAM_MESSAGE_LIMIT = 4000;

function chunkLines(lines: string[]): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const line of lines) {
    if (current && current.length + line.length + 1 > TELEGRAM_MESSAGE_LIMIT) {
      chunks.push(current);
      current = '';
    }
    current = current ? `${current}\n${line}` : line;
  }
  if (current) chunks.push(current);
  return chunks;
}

export function setupBot(config: AppConfig, database: Database): Bot {
  const bot = new Bot(config.botToken);
  bot.command('start', (ctx) =>
    ctx.reply('Привет! Отправьте мне Excel-файл со списком дней рождения.'),
  );
  bot.command('status', async (ctx) => {
    if (!isOwner(ctx, config)) return;
    await ctx.reply('Бот работает, подключение к MongoDB установлено.');
  });
  bot.command('birthdays', async (ctx) => {
    if (!isOwner(ctx, config)) return;
    const records = await database.listBirthdays();
    if (!records.length) {
      await ctx.reply('Список пуст.');
      return;
    }
    const lines = records.map(
      (r) =>
        `${r.id}: ${r.name} — ${String(r.birthdayDay).padStart(2, '0')}.${String(r.birthdayMonth).padStart(2, '0')}`,
    );
    for (const chunk of chunkLines(lines)) await ctx.reply(chunk);
  });
  bot.command('reload', (ctx) =>
    isOwner(ctx, config)
      ? ctx.reply('Для импорта отправьте новый .xlsx-файл.')
      : Promise.resolve(),
  );
  bot.command('test_month', async (ctx) => {
    if (!isOwner(ctx, config)) return;
    await sendTestMonth(bot, database, config);
  });
  bot.command('test_birthday', async (ctx) => {
    if (!isOwner(ctx, config)) return;
    await sendTestBirthdays(bot, database, config);
  });
  bot.hears(/^\.test_(month|birthday)$/, async (ctx) => {
    if (!isOwner(ctx, config)) return;
    if (ctx.match[1] === 'month') await sendTestMonth(bot, database, config);
    else await sendTestBirthdays(bot, database, config);
  });

  bot.on('message:document', async (ctx) => {
    if (!isOwner(ctx, config)) return;
    const document = ctx.message.document;
    if (!document.file_name?.toLowerCase().endsWith('.xlsx'))
      return ctx.reply('Нужен файл с расширением .xlsx');
    try {
      const file = await ctx.getFile();
      if (!file.file_path) throw new Error('Telegram не вернул путь к файлу');
      const response = await fetch(
        `https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`,
      );
      if (!response.ok)
        throw new Error(`Не удалось скачать файл: HTTP ${response.status}`);
      const records = await parseExcel(
        Buffer.from(await response.arrayBuffer()),
      );
      await database.upsertBirthdays(records);
      await ctx.reply(
        `Импорт завершен: ${records.length} записей добавлено или обновлено.`,
      );
    } catch (error) {
      await ctx.reply(
        `Импорт не выполнен: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`,
      );
    }
  });
  bot.catch((error) => {
    console.error('Error while handling update:', error.error);
  });
  return bot;
}
