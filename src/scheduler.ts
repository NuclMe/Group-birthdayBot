import cron from 'node-cron';
import { DateTime } from 'luxon';
import type { Bot } from 'grammy';
import type { Database } from './database.js';
import { birthdayMessage, monthlyMessage } from './messages.js';
import type { AppConfig } from './types.js';

export function startScheduler(
  bot: Bot,
  database: Database,
  config: AppConfig,
): void {
  cron.schedule(
    `0 ${config.monthlySummaryHour} 1 * *`,
    async () => {
      const now = DateTime.now().setZone(config.timezone);
      const key = `monthly:${now.toFormat('yyyy-MM')}`;
      if (!(await database.claimNotification(key))) return;
      const records = await database.listBirthdays(now.month);
      await bot.api.sendMessage(
        config.targetChatId,
        monthlyMessage(records, now.month),
      );
    },
    { timezone: config.timezone },
  );

  cron.schedule(
    `0 ${config.birthdayMessageHour} * * *`,
    async () => {
      const now = DateTime.now().setZone(config.timezone);
      const records = (await database.listBirthdays(now.month)).filter(
        (record) => record.birthdayDay === now.day,
      );
      for (const record of records) {
        const key = `birthday:${now.toFormat('yyyy-MM-dd')}:${record.id}`;
        if (await database.claimNotification(key))
          await bot.api.sendMessage(
            config.targetChatId,
            birthdayMessage(record),
          );
      }
    },
    { timezone: config.timezone },
  );
}

export async function sendTestMonth(
  bot: Bot,
  database: Database,
  config: AppConfig,
): Promise<void> {
  const now = DateTime.now().setZone(config.timezone);
  await bot.api.sendMessage(
    config.targetChatId,
    monthlyMessage(await database.listBirthdays(now.month), now.month),
  );
}

export async function sendTestBirthdays(
  bot: Bot,
  database: Database,
  config: AppConfig,
): Promise<void> {
  const now = DateTime.now().setZone(config.timezone);
  const records = (await database.listBirthdays(now.month)).filter(
    (record) => record.birthdayDay === now.day,
  );
  if (!records.length) {
    await bot.api.sendMessage(
      config.targetChatId,
      'Сегодня дней рождения нет.',
    );
    return;
  }
  for (const record of records)
    await bot.api.sendMessage(config.targetChatId, birthdayMessage(record));
}
