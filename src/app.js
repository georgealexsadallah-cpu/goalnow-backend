const express = require("express");
const cors = require("cors");

const matchesRoutes = require("./routes/matches.routes");
const leaguesRoutes = require("./routes/leagues.routes");
const standingsRoutes = require("./routes/standings.routes");
const tipsRoutes = require("./routes/tips.routes");
const searchRoutes = require("./routes/search.routes");
const aiRoutes = require("./routes/ai.routes");
const { getCacheStats } = require("./utils/cache");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    app: "GoalNow API",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "GoalNow backend is running",
    timestamp: new Date().toISOString(),
    cache: getCacheStats(),
  });
});

app.use("/matches", matchesRoutes);
app.use("/leagues", leaguesRoutes);
app.use("/standings", standingsRoutes);
app.use("/tips", tipsRoutes);
app.use("/search", searchRoutes);
app.use("/ai", aiRoutes);

module.exports = app;