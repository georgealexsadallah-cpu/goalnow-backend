const express = require("express");
const cors = require("cors");

const matchesRoutes = require("./routes/matches.routes");
const leaguesRoutes = require("./routes/leagues.routes");
const standingsRoutes = require("./routes/standings.routes");
const tipsRoutes = require("./routes/tips.routes");
const { getCacheStats } = require("./utils/cache");

const app = express();

app.use(cors());
app.use(express.json());

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

module.exports = app;