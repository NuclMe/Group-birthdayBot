import { loadConfig } from './config.js';
import { Database } from './database.js';
import { setupBot } from './bot.js';
import { startScheduler } from './scheduler.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const database = new Database(config.mongoUri, config.mongoDatabase);
  await database.connect();
  const bot = setupBot(config, database);
  startScheduler(bot, database, config);
  await bot.api.setMyCommands([
    { command: 'start', description: 'Запустить бота' },
    { command: 'birthdays', description: 'Показать дни рождения' },
    { command: 'status', description: 'Проверить состояние' },
  ]);
  console.log('Birthday bot started');
  await bot.start();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
