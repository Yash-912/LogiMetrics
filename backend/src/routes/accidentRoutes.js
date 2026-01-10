import express from "express";
import AccidentZone from "../models/AccidentZone.js";

const router = express.Router();

// Heatmap data
router.get("/heatmap", async (req, res) => {
  const zones = await AccidentZone.find();
  res.json(zones);
});

// Nearby danger check
router.get("/nearby", async (req, res) => {
  const { lat, lng } = req.query;

  const zones = await AccidentZone.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        $maxDistance: 500,
      },
    },
  });

  res.json(zones);
});

export default router;
