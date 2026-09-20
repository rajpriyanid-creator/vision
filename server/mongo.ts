import { MongoClient, Db, Collection } from 'mongodb';

const ATLAS_FALLBACK_URI =
  'mongodb+srv://megalamadhi24_db_user:ZHu5qG3ThH6TgkK8@vision.0alfjgf.mongodb.net/?appName=vision';

function getMongoUri(): string {
  const envUri = (process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
  if (!envUri) return ATLAS_FALLBACK_URI;
  if (envUri.includes('127.0.0.1') || envUri.includes('localhost')) {
    return ATLAS_FALLBACK_URI;
  }
  return envUri;
}

const DB_NAME = (process.env.MONGO_DB_NAME || 'vision').trim();

let client: MongoClient | null = null;
let dbInstance: Db | null = null;
let isConnecting = false;
let lastConnectAttempt = 0;
let connectionFailed = false;

export async function getMongoDb(): Promise<Db | null> {
  if (dbInstance) return dbInstance;
  if (connectionFailed && Date.now() - lastConnectAttempt < 15000) {
    return null;
  }
  if (isConnecting) {
    let attempts = 0;
    while (isConnecting && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
    if (dbInstance) return dbInstance;
  }

  const uri = getMongoUri();
  try {
    isConnecting = true;
    lastConnectAttempt = Date.now();
    console.log('[MongoDB] Connecting to database cluster...');
    client = new MongoClient(uri, {
      connectTimeoutMS: 8000,
      serverSelectionTimeoutMS: 8000,
      family: 4
    });
    await client.connect();
    dbInstance = client.db(DB_NAME);
    connectionFailed = false;
    console.log(`[MongoDB] Successfully connected to database: "${DB_NAME}"`);
    isConnecting = false;
    return dbInstance;
  } catch (error: any) {
    isConnecting = false;
    connectionFailed = true;
    console.warn('[MongoDB] Connection notice (falling back to in-memory store):', error?.message || error);
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

