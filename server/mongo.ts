import { MongoClient, Db, Collection } from 'mongodb';

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb+srv://megalamadhi24_db_user:ZHu5qG3ThH6TgkK8@vision.0alfjgf.mongodb.net/?appName=vision';

const DB_NAME = process.env.MONGO_DB_NAME || 'vision';

let client: MongoClient | null = null;
let dbInstance: Db | null = null;
let isConnecting = false;

export async function getMongoDb(): Promise<Db | null> {
  if (dbInstance) return dbInstance;
  if (isConnecting) {
    let attempts = 0;
    while (isConnecting && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
    if (dbInstance) return dbInstance;
  }

  try {
    isConnecting = true;
    console.log('[MongoDB] Connecting to MongoDB Atlas...');
    client = new MongoClient(MONGO_URI, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000
    });
    await client.connect();
    dbInstance = client.db(DB_NAME);
    console.log(`[MongoDB] Successfully connected to database: "${DB_NAME}"`);
    isConnecting = false;
    return dbInstance;
  } catch (error: any) {
    isConnecting = false;
    console.error('[MongoDB] Connection error:', error?.message || error);
    return null;
  }
}

export async function getCollection<T extends Document = any>(
  collectionName: string
): Promise<Collection<T> | null> {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection<T>(collectionName);
}
