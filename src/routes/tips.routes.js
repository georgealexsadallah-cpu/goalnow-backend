const express = require("express");
const tipsController = require("../controllers/tips.controller");

const router = express.Router();

router.get("/todays-picks", tipsController.getTodaysPicks);
router.post("/generate", tipsController.generatePicks);

module.exports = router;