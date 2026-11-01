import { Router } from "express";
import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";

const router = Router();

// GET /events/recent
// Returns at most 6 upcoming events (eventDate in the future),
// soonest first. Reuses the shared MongoDB connection from db/connection.js.
router.get("/recent", async (req, res, next) => {
    try {
        const now = new Date();

        // Only future events. eventDate may be stored either as a real BSON
        // date or as an ISO 8601 string. MongoDB never compares values across
        // BSON types (strings sort before dates in the type order), so a bare
        // `{ $gt: new Date() }` would silently match no string-typed dates.
        // Compare each stored type against a value of the same type instead:
        //   - date fields   vs. a Date
        //   - string fields vs. now.toISOString() (ISO 8601 strings sort
        //     lexicographically in the same chronological order as dates)
        const events = await getDb()
            .collection("events")
            .find({
                $or: [
                    { eventDate: { $type: "date", $gt: now } },
                    { eventDate: { $type: "string", $gt: now.toISOString() } },
                ],
            })
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


// GET /events
// Returns all upcoming events, soonest first.
router.get("/", async (req, res, next) => {
  try {
    const now = new Date();

    const events = await getDb()
      .collection("events")
      .find({
        $or: [
          { eventDate: { $type: "date", $gt: now } },
          { eventDate: { $type: "string", $gt: now.toISOString() } },
        ],
      })
      .sort({ eventDate: 1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: "Upcoming events retrieved successfully",
      data: events,
    });
  } catch (err) {
    next(err);
  }
});


// GET /events/:id
// Retrieves a single event by its MongoDB ObjectId.
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate the MongoDB ObjectId before querying.
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await getDb()
      .collection("events")
      .findOne({ _id: new ObjectId(id) });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Event retrieved successfully",
      data: event,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
