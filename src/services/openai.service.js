const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

const generateOpenAIResponse = async ({
  message,
  contextText = "",
}) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const instructions = [
    "You are GoalNow AI, a football match assistant.",
    "Answer clearly and briefly.",
    "Use the supplied match context when it exists.",
    "Do not invent facts that are not in the context.",
    "If data is missing, say so plainly.",
  ].join(" ");

  const input = contextText
    ? `MATCH CONTEXT:\n${contextText}\n\nUSER QUESTION:\n${message}`
    : `USER QUESTION:\n${message}`;

  const response = await client.responses.create({
    model: DEFAULT_OPENAI_MODEL,
    instructions,
    input,
    max_output_tokens: 300,
  });

  return {
    provider: "openai",
    model: DEFAULT_OPENAI_MODEL,
    text: response.output_text || "",
  };
};

module.exports = {
  generateOpenAIResponse,
};