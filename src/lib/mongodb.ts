import mongoose from "mongoose";

type CachedConnection = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = global as typeof globalThis & {
  mongooseCache?: CachedConnection;
};

const cached = globalWithMongoose.mongooseCache ?? {
  conn: null,
  promise: null
};

globalWithMongoose.mongooseCache = cached;

export async function connectToDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI غير مضبوط في ملف البيئة.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  cached.promise ??= mongoose.connect(MONGODB_URI, {
    dbName: "chatzi",
    bufferCommands: false,
    maxPoolSize: Number(process.env.MONGODB_POOL_MAX || 20),
    minPoolSize: Number(process.env.MONGODB_POOL_MIN || 2),
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 10000),
    socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS || 45000),
    maxIdleTimeMS: Number(process.env.MONGODB_MAX_IDLE_TIME_MS || 60000),
  });

  cached.conn = await cached.promise;
  return cached.conn;
}
