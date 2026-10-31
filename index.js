import "dotenv/config";
import express from "express";
import cors from "cors";
import {
    connectToMongoDB,
    closeMongoDB,
    isDatabaseConnected,
} from "./db/connection.js";
import eventsRouter from "./routes/events.js";

// Environment-based configuration (all values come from .env).
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const app = express();

// CORS: only the Next.js frontend origin is allowed. Using an array makes
// cors validate the request's Origin header - any other origin receives
// no CORS headers at all, so it can never read our responses in a browser.
const allowedOrigins = [CLIENT_URL];

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    })
);

// Parse incoming JSON request bodies.
app.use(express.json());

// Root endpoint (kept from the original server).
app.get("/", (req, res) => {
    res.send("Hello, World!");
});

// Health-check endpoint.
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "GreenHands server is running",
        database: isDatabaseConnected() ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
    });
});

// Routes. Registered before the 404 handler below so they can match.
app.use("/events", eventsRouter);

// 404: no route matched the request.
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

// Centralized error handler. Express requires exactly 4 arguments to
// recognize it as an error handler, so do not remove "next".
app.use((err, req, res, next) => {
    // Invalid JSON body sent by the client (thrown by express.json()).
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON in request body.",
        });
    }

    // Use the error's own status when it has one, otherwise assume 500.
    const status = err.status || err.statusCode || 500;
    // Never leak internal details of server errors to the client.
    const message =
        status >= 500 ? "Internal server error." : err.message || "Something went wrong.";

    if (status >= 500) {
        console.error(err);
    }

    res.status(status).json({
        success: false,
        message,
    });
});

// The server only starts after MongoDB connects successfully.
async function startServer() {
    try {
        await connectToMongoDB();

        const server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

        // Close the HTTP server and the MongoDB connection on Ctrl+C.
        const shutdown = () => {
            server.close(async () => {
                await closeMongoDB().catch((err) =>
                    console.error("Error closing MongoDB:", err.message)
                );
                process.exit(0);
            });
        };

        process.once("SIGINT", shutdown);
        process.once("SIGTERM", shutdown);
    } catch (err) {
        // Database startup failure: explain the problem and stop the process.
        console.error("Failed to start server:", err.message);
        process.exit(1);
    }
}

startServer();
