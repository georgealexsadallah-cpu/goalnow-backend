const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const DEFAULT_GROQ_MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const generateGroqResponse = async ({
  message,
  contextText = "",
}) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing.");
  }

  const instructions = [
    "You are GoalNow AI, a football match assistant.",
    "Keep answers short, fast, and useful.",
    "Use the supplied match context when it exists.",
    "Do not invent facts that are not in the context.",
    "If data is missing, say so plainly.",
  ].join(" ");

  const input = contextText
    ? `MATCH CONTEXT:\n${contextText}\n\nUSER QUESTION:\n${message}`
    : `USER QUESTION:\n${message}`;

  const response = await client.responses.create({
    model: DEFAULT_GROQ_MODEL,
    instructions,
    input,
    max_output_tokens: 220,
  });

  return {
    provider: "groq",
    model: DEFAULT_GROQ_MODEL,
    text: response.output_text || "",
  };
};

module.exports = {
  generateGroqResponse,
};