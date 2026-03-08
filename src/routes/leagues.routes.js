const express = require("express");
const leaguesController = require("../controllers/leagues.controller");

const router = express.Router();

router.get("/", leaguesController.getLeagues);

module.exports = router;