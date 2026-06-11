import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "multiboard";

if (!uri) {
  // Thrown lazily on first use so `next build` without env still works.
  console.warn("[mongodb] MONGODB_URI is not set — DB calls will fail until it is.");
}

// In serverless / dev with HMR we must reuse a single client across invocations,
// otherwise every request opens a new connection pool and exhausts the DB.
let clientPromise: Promise<MongoClient> | undefined;

declare global {
  // eslint-disable-next-line no-var
  var _multiboardMongo: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!uri) throw new Error("MONGODB_URI environment variable is not set.");
  if (process.env.NODE_ENV === "development") {
    if (!global._multiboardMongo) {
      global._multiboardMongo = new MongoClient(uri).connect();
    }
    return global._multiboardMongo;
  }
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}
