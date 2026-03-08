const express = require("express");
const matchesController = require("../controllers/matches.controller");

const router = express.Router();

router.get("/", matchesController.getMatches);
router.get("/:id", matchesController.getMatchDetails);

module.exports = router;