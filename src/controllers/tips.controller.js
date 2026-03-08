const tipsService = require("../services/tips.service");

const isValidDateFormat = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(dateString);
};

const isValidCount = (count) => {
  const numericCount = Number(count);

  return Number.isInteger(numericCount) && numericCount >= 5 && numericCount <= 15;
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

module.exports = {
  getTodaysPicks,
  generatePicks,
};