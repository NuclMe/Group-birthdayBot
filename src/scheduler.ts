import cron from 'node-cron';
import { DateTime } from 'luxon';
import type { Bot } from 'grammy';
import type { Database } from './database.js';
import { birthdayMessage, monthlyMessage } from './messages.js';
import type { AppConfig } from './types.js';

async function sendOnce(
  database: Database,
  key: string,
  send: () => Promise<unknown>,
): Promise<void> {
  if (!(await database.claimNotification(key))) return;
  try {
    await send();
  } catch (error) {
    // Освобождаем ключ, чтобы неотправленное уведомление можно было повторить.
    await database.releaseNotification(key).catch(() => undefined);
    throw error;
  }
}

function safeJob(name: string, job: () => Promise<void>): () => Promise<void> {
  return async () => {
    try {
      await job();
    } catch (error) {
      console.error(`Scheduled job failed: ${name}`, error);
    }
  };
}

export function startScheduler(
  bot: Bot,
  database: Database,
  config: AppConfig,
): void {
  cron.schedule(
    `0 ${config.monthlySummaryHour} 1 * *`,
    safeJob('monthly', async () => {
      const now = DateTime.now().setZone(config.timezone);
      const key = `monthly:${now.toFormat('yyyy-MM')}`;
      await sendOnce(database, key, async () =>
        bot.api.sendMessage(
          config.targetChatId,
          monthlyMessage(await database.listBirthdays(now.month), now.month),
        ),
      );
    }),
    { timezone: config.timezone },
  );

  cron.schedule(
    `0 ${config.birthdayMessageHour} * * *`,
    safeJob('birthday', async () => {
      const now = DateTime.now().setZone(config.timezone);
      const records = (await database.listBirthdays(now.month)).filter(
        (record) => record.birthdayDay === now.day,
      );
      for (const record of records) {
        const key = `birthday:${now.toFormat('yyyy-MM-dd')}:${record.id}`;
        try {
          await sendOnce(database, key, () =>
            bot.api.sendMessage(config.targetChatId, birthdayMessage(record)),
          );
        } catch (error) {
          console.error(`Failed to send birthday message for ${record.id}`, error);
        }
      }
    }),
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
