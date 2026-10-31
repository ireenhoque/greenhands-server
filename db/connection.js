import { MongoClient } from "mongodb";

// One client instance is kept here and reused for the whole lifetime of the
// server, so we never open more MongoDB connections than necessary.
let client = null;

export async function connectToMongoDB() {
    const { MONGO_URI, DB_NAME } = process.env;

    // Fail fast (before touching the network) if the environment is misconfigured.
    if (!MONGO_URI) {
        throw new Error(
            "MONGO_URI is not set. Add it to your .env file (see .env.example)."
        );
    }

    if (!DB_NAME) {
        throw new Error(
            "DB_NAME is not set. Add it to your .env file (see .env.example)."
        );
    }

    // Already connected: reuse the existing client instead of opening another one.
    if (client) {
        return client;
    }

    try {
        client = new MongoClient(MONGO_URI);
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        client = null;
        // The connection failed: reset the client and let the caller handle it.
        throw new Error(`Could not connect to MongoDB: ${err.message}`);
    }
}

// Use this inside routes: getDb().collection("events")
export function getDb() {
    if (!client) {
        throw new Error(
            "MongoDB is not connected yet. Call connectToMongoDB() first."
        );
    }
    return client.db(process.env.DB_NAME);
}

// Used by the health-check endpoint.
export function isDatabaseConnected() {
    return client !== null;
}

// Closes the connection cleanly (used when the server shuts down).
export async function closeMongoDB() {
    if (!client) {
        return;
    }
    await client.close();
    client = null;
    console.log("MongoDB connection closed.");
}
