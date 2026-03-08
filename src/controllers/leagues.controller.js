const leaguesService = require("../services/leagues.service");

const getLeagues = async (req, res) => {
  try {
    const leagues = await leaguesService.getLeagues();

    return res.status(200).json({
      success: true,
      ...leagues,
    });
  } catch (error) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch leagues.";

    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

module.exports = {
  getLeagues,
};