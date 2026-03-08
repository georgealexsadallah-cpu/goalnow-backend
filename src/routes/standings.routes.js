const express = require("express");
const standingsController = require("../controllers/standings.controller");

const router = express.Router();

router.get("/", standingsController.getStandings);

module.exports = router;