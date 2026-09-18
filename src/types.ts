export interface Birthday {
  id: string;
  name: string;
  birthdayDay: number;
  birthdayMonth: number;
  username?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AppConfig {
  botToken: string;
  mongoUri: string;
  mongoDatabase: string;
  targetChatId: string;
  ownerTelegramId: number;
  timezone: string;
  monthlySummaryHour: number;
  birthdayMessageHour: number;
}
