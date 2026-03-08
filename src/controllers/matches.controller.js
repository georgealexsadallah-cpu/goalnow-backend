const matchesService = require("../services/matches.service");

const isValidDateFormat = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(dateString);
};

const isValidId = (value) => {
  return /^\d+$/.test(String(value));
};

const getMatches = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "The 'date' query parameter is required. Use format YYYY-MM-DD.",
      });
    }

    if (!isValidDateFormat(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
    }

    const matches = await matchesService.getMatchesByDate(date);

    return res.status(200).json({
      success: true,
      ...matches,
    });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch matches.";

    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

const getMatchDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid match id.",
      });
    }

    const matchDetails = await matchesService.getMatchDetailsById(id);

    return res.status(200).json({
      success: true,
      data: matchDetails,
    });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch match details.";

    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

module.exports = {
  getMatches,
  getMatchDetails,
};