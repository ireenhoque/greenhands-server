import { Router } from "express";
import { getDb } from "../db/connection.js";

const router = Router();

// GET /events/recent
// Returns at most 6 upcoming events (eventDate in the future),
// soonest first. Reuses the shared MongoDB connection from db/connection.js.
router.get("/recent", async (req, res, next) => {
    try {
        const events = await getDb()
            .collection("events")
            .find({ eventDate: { $gt: new Date() } }) // only future events
            .sort({ eventDate: 1 }) // soonest event first (ascending)
            .limit(6) // maximum 6 results
            .toArray();

        // events is a plain array - empty [] when nothing is upcoming.
        res.status(200).json({
            success: true,
            message: "Upcoming events retrieved successfully",
            data: events,
        });
    } catch (err) {
        // Hand the error to the centralized error handler in index.js.
        next(err);
    }
});

export default router;
