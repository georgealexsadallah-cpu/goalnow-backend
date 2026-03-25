const safeArray = (value) => (Array.isArray(value) ? value : []);

const safeObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const getResultFromFixture = (fixtureItem, teamId) => {
  const item = safeObject(fixtureItem);
  const teams = safeObject(item.teams);
  const goals = safeObject(item.goals);

  const isHome = teams.home?.id === teamId;
  const isAway = teams.away?.id === teamId;

  if (!isHome && !isAway) return null;

  const goalsFor = isHome ? goals.home : goals.away;
  const goalsAgainst = isHome ? goals.away : goals.home;

  if (goalsFor == null || goalsAgainst == null) return null;

  if (goalsFor > goalsAgainst) return "W";
  if (goalsFor < goalsAgainst) return "L";
  return "D";
};

const getRecentFormScore = (fixtures, teamId) => {
  return safeArray(fixtures).reduce((score, fixtureItem) => {
    const result = getResultFromFixture(fixtureItem, teamId);

    if (result === "W") return score + 3;
    if (result === "D") return score + 1;
    return score;
  }, 0);
};

const getRecentGoals = (fixtures, teamId) => {
  return safeArray(fixtures).reduce(
    (acc, fixtureItem) => {
      const item = safeObject(fixtureItem);
      const teams = safeObject(item.teams);
      const goals = safeObject(item.goals);

      const isHome = teams.home?.id === teamId;
      const isAway = teams.away?.id === teamId;

      if (!isHome && !isAway) {
        return acc;
      }

      const goalsFor = isHome ? goals.home : goals.away;
      const goalsAgainst = isHome ? goals.away : goals.home;

      return {
        scored: acc.scored + (typeof goalsFor === "number" ? goalsFor : 0),
        conceded:
          acc.conceded + (typeof goalsAgainst === "number" ? goalsAgainst : 0),
      };
    },
    { scored: 0, conceded: 0 }
  );
};

const extractStandingRows = (standingsResponse) => {
  const response = safeArray(standingsResponse);
  const league = safeObject(response[0]?.league);
  const groups = safeArray(league.standings);

  return groups.flatMap((group) => (Array.isArray(group) ? group : []));
};

const findStandingRow = (standingsResponse, teamId) => {
  return (
    extractStandingRows(standingsResponse).find((row) => row?.team?.id === teamId) ||
    null
  );
};

const getTableScore = (row) => {
  if (!row) return 0;

  const rank = Number(row.rank || 0);
  if (!rank) return 0;

  return Math.max(0, 25 - rank);
};

const getGoalTrendScore = (goalsSummary) => {
  const scored = Number(goalsSummary.scored || 0);
  const conceded = Number(goalsSummary.conceded || 0);
  return scored - conceded;
};

const getH2HScore = (h2hFixtures, teamId) => {
  let score = 0;

  safeArray(h2hFixtures)
    .slice(0, 5)
    .forEach((fixtureItem) => {
      const result = getResultFromFixture(fixtureItem, teamId);

      if (result === "W") score += 2;
      if (result === "D") score += 1;
    });

  return score;
};

const buildWinnerLabel = ({ homeName, awayName, homeScore, awayScore }) => {
  const diff = homeScore - awayScore;

  if (Math.abs(diff) <= 1) return "Balanced";
  if (diff > 0) return homeName || "Home";
  return awayName || "Away";
};

const buildConfidence = (diff) => {
  const absolute = Math.abs(diff);

  if (absolute >= 8) return "High";
  if (absolute >= 4) return "Medium";
  return "Low";
};

const buildGoalsLean = ({
  homeGoalsSummary,
  awayGoalsSummary,
  homeRecentFixtures,
  awayRecentFixtures,
}) => {
  const totalScored =
    Number(homeGoalsSummary.scored || 0) + Number(awayGoalsSummary.scored || 0);
  const totalConceded =
    Number(homeGoalsSummary.conceded || 0) +
    Number(awayGoalsSummary.conceded || 0);

  const matchCount =
    Math.max(safeArray(homeRecentFixtures).length, 1) +
    Math.max(safeArray(awayRecentFixtures).length, 1);

  const averageGoalSignals = (totalScored + totalConceded) / matchCount;

  if (averageGoalSignals >= 2.8) {
    return "Over 2.5";
  }

  return "Under 2.5";
};

const buildBttsLean = ({ homeGoalsSummary, awayGoalsSummary }) => {
  const homeScored = Number(homeGoalsSummary.scored || 0);
  const homeConceded = Number(homeGoalsSummary.conceded || 0);
  const awayScored = Number(awayGoalsSummary.scored || 0);
  const awayConceded = Number(awayGoalsSummary.conceded || 0);

  if (homeScored > 0 && awayScored > 0 && homeConceded > 0 && awayConceded > 0) {
    return "Yes";
  }

  return "No";
};

const buildRisk = (confidence) => {
  if (confidence === "High") return "Low";
  if (confidence === "Medium") return "Medium";
  return "High";
};

const buildShortReason = ({
  winner,
  homeName,
  awayName,
  homeFormScore,
  awayFormScore,
  homeTableScore,
  awayTableScore,
}) => {
  if (winner === "Balanced") {
    return "The teams look close on recent form and table strength.";
  }

  if (winner === homeName) {
    if (homeFormScore >= awayFormScore && homeTableScore >= awayTableScore) {
      return `${homeName} has the stronger recent form and table profile.`;
    }

    return `${homeName} has a slight edge based on the available data.`;
  }

  if (awayFormScore >= homeFormScore && awayTableScore >= homeTableScore) {
    return `${awayName} has the stronger recent form and table profile.`;
  }

  return `${awayName} has a slight edge based on the available data.`;
};

const buildPrediction = ({
  fixture,
  homeLastMatches,
  awayLastMatches,
  h2h,
  standings,
  statistics,
}) => {
  const safeFixture = safeObject(fixture);
  const homeTeam = safeObject(safeFixture.teams?.home);
  const awayTeam = safeObject(safeFixture.teams?.away);

  const homeId = homeTeam.id ?? null;
  const awayId = awayTeam.id ?? null;

  const homeRecentFixtures = safeArray(homeLastMatches);
  const awayRecentFixtures = safeArray(awayLastMatches);
  const h2hFixtures = safeArray(h2h);

  const homeStandingRow = findStandingRow(standings, homeId);
  const awayStandingRow = findStandingRow(standings, awayId);

  const homeFormScore = getRecentFormScore(homeRecentFixtures, homeId);
  const awayFormScore = getRecentFormScore(awayRecentFixtures, awayId);

  const homeTableScore = getTableScore(homeStandingRow);
  const awayTableScore = getTableScore(awayStandingRow);

  const homeGoalsSummary = getRecentGoals(homeRecentFixtures, homeId);
  const awayGoalsSummary = getRecentGoals(awayRecentFixtures, awayId);

  const homeGoalTrendScore = getGoalTrendScore(homeGoalsSummary);
  const awayGoalTrendScore = getGoalTrendScore(awayGoalsSummary);

  const homeH2HScore = getH2HScore(h2hFixtures, homeId);
  const awayH2HScore = getH2HScore(h2hFixtures, awayId);

  let homeScore = 0;
  let awayScore = 0;

  homeScore += homeFormScore;
  awayScore += awayFormScore;

  homeScore += homeTableScore;
  awayScore += awayTableScore;

  homeScore += homeGoalTrendScore;
  awayScore += awayGoalTrendScore;

  homeScore += homeH2HScore;
  awayScore += awayH2HScore;

  homeScore += 2;

  const winner = buildWinnerLabel({
    homeName: homeTeam.name || "Home",
    awayName: awayTeam.name || "Away",
    homeScore,
    awayScore,
  });

  const confidence = buildConfidence(homeScore - awayScore);
  const goalsLean = buildGoalsLean({
    homeGoalsSummary,
    awayGoalsSummary,
    homeRecentFixtures,
    awayRecentFixtures,
  });

  const btts = buildBttsLean({
    homeGoalsSummary,
    awayGoalsSummary,
  });

  const risk = buildRisk(confidence);

  const shortReason = buildShortReason({
    winner,
    homeName: homeTeam.name || "Home",
    awayName: awayTeam.name || "Away",
    homeFormScore,
    awayFormScore,
    homeTableScore,
    awayTableScore,
  });

  return {
    winner,
    confidence,
    goalsLean,
    btts,
    risk,
    scores: {
      home: homeScore,
      away: awayScore,
    },
    components: {
      form: {
        home: homeFormScore,
        away: awayFormScore,
      },
      table: {
        home: homeTableScore,
        away: awayTableScore,
      },
      goalTrend: {
        home: homeGoalTrendScore,
        away: awayGoalTrendScore,
      },
    },
    shortReason,
    h2hCount: h2hFixtures.length,
    meta: {
      statisticsCount: safeArray(statistics).length,
      standingsAvailable: !!homeStandingRow || !!awayStandingRow,
    },
  };
};

module.exports = {
  buildPrediction,
};