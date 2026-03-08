const standingsService = require("../services/standings.service");

const isValidNumericValue = (value) => {
  return /^\d+$/.test(String(value));
};

const getStandings = async (req, res) => {
  try {
    const { league, season } = req.query;

    if (!league) {
      return res.status(400).json({
        success: false,
        message: "The 'league' query parameter is required.",
      });
    }

    if (!season) {
      return res.status(400).json({
        success: false,
        message: "The 'season' query parameter is required.",
      });
    }

    if (!isValidNumericValue(league)) {
      return res.status(400).json({
        success: false,
        message: "Invalid 'league' value. It must be numeric.",
      });
    }

    if (!isValidNumericValue(season)) {
      return res.status(400).json({
        success: false,
        message: "Invalid 'season' value. It must be numeric.",
      });
    }

    const standings = await standingsService.getStandings(league, season);

    return res.status(200).json({
      success: true,
      data: standings,
    });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch standings.";

    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

module.exports = {
  getStandings,
};