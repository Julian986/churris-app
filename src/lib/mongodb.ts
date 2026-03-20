import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Falta configurar MONGODB_URI en el entorno.");
}

const globalForMongo = globalThis as unknown as {
  mongoClientPromise?: Promise<MongoClient>;
};

const client = new MongoClient(uri);

const mongoClientPromise = globalForMongo.mongoClientPromise ?? client.connect();

if (process.env.NODE_ENV !== "production") {
  globalForMongo.mongoClientPromise = mongoClientPromise;
}

export async function getMongoDb() {
  const connectedClient = await mongoClientPromise;
  return connectedClient.db("churris_contratos");
}
