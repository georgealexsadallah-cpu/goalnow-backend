const aiRouterService = require("../services/ai-router.service");

const isValidMode = (mode) => {
  return ["auto", "quick", "deep"].includes(String(mode).toLowerCase());
};

const chat = async (req, res) => {
  try {
    const { message, mode = "auto", matchId = null } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: "The 'message' field is required.",
      });
    }

    if (!isValidMode(mode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mode. Allowed values are auto, quick, deep.",
      });
    }

    const result = await aiRouterService.generateChatResponse({
      message: String(message).trim(),
      mode: String(mode).toLowerCase(),
      matchId: matchId ? Number(matchId) : null,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate AI response.",
    });
  }
};

module.exports = {
  chat,
};