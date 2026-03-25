const safeArray = (value) => (Array.isArray(value) ? value : []);

const safeObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const pluralize = (count, word) => {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
};

const getResultLabel = (result) => {
  if (result === "W") return "won";
  if (result === "L") return "lost";
  return "drew";
};

const countResults = (matches = []) => {
  const safeMatches = safeArray(matches);

  let wins = 0;
  let draws = 0;
  let losses = 0;

  safeMatches.forEach((match) => {
    const result = String(match?.result || "").toUpperCase();

    if (result === "W") wins += 1;
    else if (result === "D") draws += 1;
    else if (result === "L") losses += 1;
  });

  return { wins, draws, losses };
};

const sumGoalsFromForm = (matches = []) => {
  return safeArray(matches).reduce(
    (acc, match) => {
      const label = String(match?.scoreLabel || "-");
      const parts = label.split("-");

      if (parts.length !== 2) {
        return acc;
      }

      const first = Number(parts[0]);
      const second = Number(parts[1]);

      if (Number.isNaN(first) || Number.isNaN(second)) {
        return acc;
      }

      return {
        totalGoals: acc.totalGoals + first + second,
        matchesWithScore: acc.matchesWithScore + 1,
      };
    },
    { totalGoals: 0, matchesWithScore: 0 }
  );
};

const buildTeamFormInsight = (teamName, matches = []) => {
  const safeMatches = safeArray(matches);

  if (!safeMatches.length) {
    return `${teamName} are being evaluated using GoalNow AI form fallback because recent match data is limited.`;
  }

  const { wins, draws, losses } = countResults(safeMatches);
  const played = safeMatches.length;

  if (wins >= 4) {
    return `${teamName} won ${wins} of their last ${played} matches.`;
  }

  if (losses >= 4) {
    return `${teamName} lost ${losses} of their last ${played} matches.`;
  }

  if (draws >= 3) {
    return `${teamName} drew ${draws} of their last ${played} matches.`;
  }

  const latest = safeMatches[0];
  const latestResult = String(latest?.result || "").toUpperCase();

  if (latestResult) {
    return `${teamName} ${getResultLabel(latestResult)} their most recent match and remain under close GoalNow AI review.`;
  }

  return `${teamName} have mixed recent form across their last ${played} matches.`;
};

const buildGoalsInsight = (teamName, matches = []) => {
  const summary = sumGoalsFromForm(matches);

  if (!summary.matchesWithScore) {
    return `${teamName} have limited scoring data available, so GoalNow AI is using a balanced attacking fallback.`;
  }

  const avg = summary.totalGoals / summary.matchesWithScore;

  if (summary.totalGoals >= 10) {
    return `${teamName} have been involved in ${summary.totalGoals} total goals across their last ${summary.matchesWithScore} matches.`;
  }

  if (avg >= 3) {
    return `${teamName} recent matches are trending high-scoring at ${avg.toFixed(1)} total goals per game.`;
  }

  if (avg <= 1.8) {
    return `${teamName} recent matches are trending tight, averaging ${avg.toFixed(1)} total goals per game.`;
  }

  return `${teamName} recent goal trend looks balanced at ${avg.toFixed(1)} total goals per game.`;
};

const buildTableInsight = (homeRow, awayRow, homeTeamName, awayTeamName) => {
  const safeHome = safeObject(homeRow);
  const safeAway = safeObject(awayRow);

  const homePos = Number(safeHome.position || 0);
  const awayPos = Number(safeAway.position || 0);

  if (homePos && awayPos) {
    if (homePos < awayPos) {
      return `${homeTeamName} are ranked higher in the table than ${awayTeamName}.`;
    }

    if (awayPos < homePos) {
      return `${awayTeamName} are ranked higher in the table than ${homeTeamName}.`;
    }

    return `${homeTeamName} and ${awayTeamName} are level in table standing pressure.`;
  }

  if (homePos) {
    return `${homeTeamName} table position is available, while ${awayTeamName} are being assessed through GoalNow AI fallback logic.`;
  }

  if (awayPos) {
    return `${awayTeamName} table position is available, while ${homeTeamName} are being assessed through GoalNow AI fallback logic.`;
  }

  return `League table data is limited, so GoalNow AI is balancing this matchup using form and scoring trends.`;
};

const buildH2HInsight = (homeTeamName, awayTeamName, h2hMatches = []) => {
  const safeH2H = safeArray(h2hMatches);

  if (!safeH2H.length) {
    return `${homeTeamName} and ${awayTeamName} have limited recent head-to-head data, so GoalNow AI is relying more on form and table signals.`;
  }

  const sample = safeH2H.slice(0, 3);
  let draws = 0;

  sample.forEach((match) => {
    const score = safeObject(match?.score);
    const home = score.home;
    const away = score.away;

    if (home != null && away != null && Number(home) === Number(away)) {
      draws += 1;
    }
  });

  if (draws === 0 && sample.length >= 2) {
    return `${homeTeamName} and ${awayTeamName} have not drawn any of their last ${sample.length} head-to-head meetings.`;
  }

  if (draws >= 2) {
    return `${homeTeamName} and ${awayTeamName} have shown a draw trend in recent head-to-head meetings.`;
  }

  return `Recent head-to-head meetings between ${homeTeamName} and ${awayTeamName} show a competitive matchup pattern.`;
};

const buildStrengthFallbackInsight = (
  homeTeamName,
  awayTeamName,
  homeForm = [],
  awayForm = []
) => {
  const homeCounts = countResults(homeForm);
  const awayCounts = countResults(awayForm);

  if (homeCounts.wins > awayCounts.wins) {
    return `${homeTeamName} hold a slight GoalNow AI edge based on recent winning form.`;
  }

  if (awayCounts.wins > homeCounts.wins) {
    return `${awayTeamName} hold a slight GoalNow AI edge based on recent winning form.`;
  }

  return `${homeTeamName} and ${awayTeamName} look closely matched on current GoalNow AI strength signals.`;
};

const buildInsights = ({
  homeTeamName,
  awayTeamName,
  homeForm,
  awayForm,
  homeStandingRow,
  awayStandingRow,
  h2hMatches,
}) => {
  const insights = [
    buildTeamFormInsight(homeTeamName, homeForm),
    buildGoalsInsight(homeTeamName, homeForm),
    buildH2HInsight(homeTeamName, awayTeamName, h2hMatches),
    buildGoalsInsight(awayTeamName, awayForm),
    buildTableInsight(
      homeStandingRow,
      awayStandingRow,
      homeTeamName,
      awayTeamName
    ),
    buildStrengthFallbackInsight(
      homeTeamName,
      awayTeamName,
      homeForm,
      awayForm
    ),
  ].filter(Boolean);

  return insights.slice(0, 6);
};

module.exports = {
  buildInsights,
};