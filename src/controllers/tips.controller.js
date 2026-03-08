const tipsService = require("../services/tips.service");

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

module.exports = {
  getTodaysPicks,
};