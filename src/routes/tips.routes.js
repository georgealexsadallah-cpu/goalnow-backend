const express = require("express");
const tipsController = require("../controllers/tips.controller");

const router = express.Router();

router.get("/todays-picks", tipsController.getTodaysPicks);
router.post("/generate", tipsController.generatePicks);
router.get("/community", tipsController.getCommunityPicks);
router.post("/vote", tipsController.submitCommunityVote);

module.exports = router;