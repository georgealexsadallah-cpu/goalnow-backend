const tipsService = require("../services/tips.service");
const communityPicksService = require("../services/community-picks.service");

const isValidDateFormat = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(dateString);
};

const isValidCount = (count) => {
  const numericCount = Number(count);

  return Number.isInteger(numericCount) && numericCount >= 5 && numericCount <= 15;
};

const isValidVoteChoice = (choice) => {
  return ["home", "draw", "away"].includes(String(choice).toLowerCase());
};

const getTodaysPicks = async (req, res) => {
  try {
    const picks = await tipsService.getTodaysPicks();

    return res.status(200).json({
      success: true,
      ...picks,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch today's picks.",
    });
  }
};

const generatePicks = async (req, res) => {
  try {
    const { date, count } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "The 'date' field is required.",
      });
    }

    if (!isValidDateFormat(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
    }

    if (count === undefined || count === null) {
      return res.status(400).json({
        success: false,
        message: "The 'count' field is required.",
      });
    }

    if (!isValidCount(count)) {
      return res.status(400).json({
        success: false,
        message: "Invalid count. Allowed range is 5 to 15.",
      });
    }

    const generated = await tipsService.generatePicksByDate(date, Number(count));

    return res.status(200).json({
      success: true,
      ...generated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate picks.",
    });
  }
};

const getCommunityPicks = async (req, res) => {
  try {
    const { date, voterId } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "The 'date' query parameter is required.",
      });
    }

    if (!isValidDateFormat(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
    }

    const data = await communityPicksService.getCommunityPicksByDate(
      date,
      voterId ? String(voterId) : null
    );

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch community picks.",
    });
  }
};

const submitCommunityVote = async (req, res) => {
  try {
    const { matchId, voterId, choice } = req.body;

    if (!matchId) {
      return res.status(400).json({
        success: false,
        message: "The 'matchId' field is required.",
      });
    }

    if (!voterId) {
      return res.status(400).json({
        success: false,
        message: "The 'voterId' field is required.",
      });
    }

    if (!choice) {
      return res.status(400).json({
        success: false,
        message: "The 'choice' field is required.",
      });
    }

    if (!isValidVoteChoice(choice)) {
      return res.status(400).json({
        success: false,
        message: "Invalid choice. Allowed values are home, draw, away.",
      });
    }

    const result = await communityPicksService.submitVote({
      matchId: Number(matchId),
      voterId: String(voterId),
      choice: String(choice).toLowerCase(),
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit vote.",
    });
  }
};

module.exports = {
  getTodaysPicks,
  generatePicks,
  getCommunityPicks,
  submitCommunityVote,
};