const searchService = require("../services/search.service");

const searchAll = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !String(q).trim()) {
      return res.status(400).json({
        success: false,
        message: "The 'q' query parameter is required.",
      });
    }

    const result = await searchService.searchAll(String(q).trim());

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to perform search.",
    });
  }
};

module.exports = {
  searchAll,
};