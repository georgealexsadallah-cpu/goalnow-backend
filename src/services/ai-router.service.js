const matchesService = require("./matches.service");
const { generateGroqResponse } = require("./groq.service");
const { generateOpenAIResponse } = require("./openai.service");

const buildMatchContextText = async (matchId) => {
  if (!matchId) {
    return "";
  }

  try {
    const details = await matchesService.getMatchDetailsById(matchId);
    const header = details?.header || {};
    const overview = details?.preview?.overview || {};
    const timeline = details?.preview?.timeline || [];
    const stats = details?.statsTab?.overall || [];

    const timelinePreview = timeline.slice(0, 8).map((item) => {
      const time = item?.time?.label || "";
      const player = item?.player?.name || "";
      const detail = item?.detail || item?.type || "";
      return `- ${time} ${player} ${detail}`.trim();
    });

    const statsPreview = stats.slice(0, 8).map((item) => {
      return `- ${item.type}: ${item.home} vs ${item.away}`;
    });

    return [
      `Match: ${header.homeTeam?.name || "Home"} vs ${header.awayTeam?.name || "Away"}`,
      `Score: ${header.score?.home ?? "-"}-${header.score?.away ?? "-"}`,
      `Status: ${header.statusLabel || header.status || ""}`,
      `League: ${header.league?.leagueName || ""}`,
      `Round: ${overview.round || ""}`,
      `Referee: ${overview.referee || ""}`,
      "",
      "Recent timeline:",
      ...timelinePreview,
      "",
      "Key stats:",
      ...statsPreview,
    ].join("\n");
  } catch (error) {
    return "";
  }
};

const shouldUseDeepReasoning = (message) => {
  const lower = String(message).toLowerCase();

  const deepSignals = [
    "explain",
    "compare",
    "why",
    "reason",
    "analysis",
    "analyze",
    "risky",
    "safer",
    "detailed",
    "deep",
    "better pick",
    "which is better",
  ];

  return deepSignals.some((signal) => lower.includes(signal));
};

const generateChatResponse = async ({
  message,
  mode,
  matchId,
}) => {
  const contextText = await buildMatchContextText(matchId);

  if (mode === "quick") {
    const result = await generateGroqResponse({
      message,
      contextText,
    });

    return {
      mode,
      provider: result.provider,
      model: result.model,
      answer: result.text,
      matchId,
    };
  }

  if (mode === "deep") {
    const result = await generateOpenAIResponse({
      message,
      contextText,
    });

    return {
      mode,
      provider: result.provider,
      model: result.model,
      answer: result.text,
      matchId,
    };
  }

  const useDeep = shouldUseDeepReasoning(message);

  if (useDeep) {
    const result = await generateOpenAIResponse({
      message,
      contextText,
    });

    return {
      mode: "auto",
      provider: result.provider,
      model: result.model,
      answer: result.text,
      matchId,
    };
  }

  const result = await generateGroqResponse({
    message,
    contextText,
  });

  return {
    mode: "auto",
    provider: result.provider,
    model: result.model,
    answer: result.text,
    matchId,
  };
};

module.exports = {
  generateChatResponse,
};