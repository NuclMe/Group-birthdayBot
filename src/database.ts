import { MongoClient, type Collection } from 'mongodb';
import type { Birthday } from './types.js';

export class Database {
  private readonly client: MongoClient;
  private birthdays!: Collection<Birthday>;
  private notifications!: Collection<{ key: string; sentAt: Date }>;

  constructor(uri: string, databaseName: string) {
    this.client = new MongoClient(uri);
    this.databaseName = databaseName;
  }

  private readonly databaseName: string;

  async connect(): Promise<void> {
    await this.client.connect();
    const database = this.client.db(this.databaseName);
    this.birthdays = database.collection<Birthday>('birthdays');
    this.notifications = database.collection('notifications');
    await this.birthdays.createIndex({ id: 1 }, { unique: true });
    await this.notifications.createIndex({ key: 1 }, { unique: true });
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  async upsertBirthdays(records: Birthday[]): Promise<void> {
    if (!records.length) return;
    const now = new Date();
    await this.birthdays.bulkWrite(
      records.map((record) => ({
        updateOne: {
          filter: { id: record.id },
          update: {
            $set: { ...record, updatedAt: now },
            $setOnInsert: { createdAt: now },
          },
          upsert: true,
        },
      })),
    );
  }

  async listBirthdays(month?: number): Promise<Birthday[]> {
    const records = await this.birthdays
      .find(month ? { birthdayMonth: month } : {})
      .sort({ birthdayMonth: 1, birthdayDay: 1, name: 1 })
      .toArray();
    return records;
  }

  async claimNotification(key: string): Promise<boolean> {
    try {
      await this.notifications.insertOne({ key, sentAt: new Date() });
      return true;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 11000
      )
        return false;
      throw error;
    }
  }
}
