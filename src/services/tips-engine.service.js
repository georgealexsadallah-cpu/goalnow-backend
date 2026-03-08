const normalizeFormString = (form) => {
  if (!form || typeof form !== "string") {
    return [];
  }

  return form
    .toUpperCase()
    .split("")
    .filter((item) => ["W", "D", "L"].includes(item));
};

const getFormPoints = (formArray) => {
  return formArray.reduce((total, item) => {
    if (item === "W") return total + 3;
    if (item === "D") return total + 1;
    return total;
  }, 0);
};

const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
};

const buildStandingsMap = (rows) => {
  const map = new Map();

  for (const row of rows || []) {
    if (row?.team?.id) {
      map.set(row.team.id, row);
    }
  }

  return map;
};

const calculateConfidenceScore = ({
  homeRow,
  awayRow,
  fixtureItem,
}) => {
  const homeRank = homeRow?.rank ?? 99;
  const awayRank = awayRow?.rank ?? 99;

  const homePoints = homeRow?.points ?? 0;
  const awayPoints = awayRow?.points ?? 0;

  const homeGoalDiff = homeRow?.goalDifference ?? 0;
  const awayGoalDiff = awayRow?.goalDifference ?? 0;

  const homeForm = normalizeFormString(homeRow?.form ?? "");
  const awayForm = normalizeFormString(awayRow?.form ?? "");

  const homeFormPoints = getFormPoints(homeForm);
  const awayFormPoints = getFormPoints(awayForm);

  const homeHomeWins = homeRow?.home?.win ?? 0;
  const awayAwayWins = awayRow?.away?.win ?? 0;

  const homeHomePlayed = homeRow?.home?.played ?? 1;
  const awayAwayPlayed = awayRow?.away?.played ?? 1;

  const homeHomeRate = homeHomeWins / Math.max(homeHomePlayed, 1);
  const awayAwayRate = awayAwayWins / Math.max(awayAwayPlayed, 1);

  const rankGap = Math.abs(homeRank - awayRank);
  const pointsGap = Math.abs(homePoints - awayPoints);
  const goalDiffGap = Math.abs(homeGoalDiff - awayGoalDiff);
  const formGap = Math.abs(homeFormPoints - awayFormPoints);

  let homeStrength = 0;
  let awayStrength = 0;

  if (homeRank < awayRank) homeStrength += rankGap * 2.5;
  if (awayRank < homeRank) awayStrength += rankGap * 2.5;

  if (homePoints > awayPoints) homeStrength += pointsGap * 1.2;
  if (awayPoints > homePoints) awayStrength += pointsGap * 1.2;

  if (homeGoalDiff > awayGoalDiff) homeStrength += goalDiffGap * 0.5;
  if (awayGoalDiff > homeGoalDiff) awayStrength += goalDiffGap * 0.5;

  if (homeFormPoints > awayFormPoints) homeStrength += formGap * 1.5;
  if (awayFormPoints > homeFormPoints) awayStrength += formGap * 1.5;

  homeStrength += homeHomeRate * 10;
  awayStrength += awayAwayRate * 10;

  const teams = fixtureItem?.teams || {};
  const homeWinnerBias = teams.home?.winner === true ? 2 : 0;
  const awayWinnerBias = teams.away?.winner === true ? 2 : 0;

  homeStrength += homeWinnerBias;
  awayStrength += awayWinnerBias;

  const strengthGap = Math.abs(homeStrength - awayStrength);

  return {
    homeStrength,
    awayStrength,
    strengthGap,
    rankGap,
    pointsGap,
    homeFormPoints,
    awayFormPoints,
  };
};

const decidePrediction = ({
  homeStrength,
  awayStrength,
  strengthGap,
  rankGap,
  pointsGap,
  fixtureItem,
}) => {
  const homeName = fixtureItem?.teams?.home?.name ?? "Home";
  const awayName = fixtureItem?.teams?.away?.name ?? "Away";

  if (strengthGap >= 18) {
    if (homeStrength > awayStrength) {
      return {
        predictionType: "Home Win",
        predictionLabel: `${homeName} Win`,
        baseConfidence: 84,
      };
    }

    return {
      predictionType: "Away Win",
      predictionLabel: `${awayName} Win`,
      baseConfidence: 84,
    };
  }

  if (strengthGap >= 10) {
    if (homeStrength > awayStrength) {
      return {
        predictionType: "Double Chance 1X",
        predictionLabel: `${homeName} or Draw`,
        baseConfidence: 78,
      };
    }

    return {
      predictionType: "Double Chance X2",
      predictionLabel: `${awayName} or Draw`,
      baseConfidence: 78,
    };
  }

  if (rankGap <= 3 && pointsGap <= 6) {
    return {
      predictionType: "Over 1.5 Goals",
      predictionLabel: "Over 1.5 Goals",
      baseConfidence: 72,
    };
  }

  if (homeStrength >= awayStrength) {
    return {
      predictionType: "Double Chance 1X",
      predictionLabel: `${homeName} or Draw`,
      baseConfidence: 74,
    };
  }

  return {
    predictionType: "Double Chance X2",
    predictionLabel: `${awayName} or Draw`,
    baseConfidence: 74,
  };
};

const buildConfidence = (baseConfidence, scoreData) => {
  const bonus =
    Math.min(scoreData.rankGap, 10) * 0.6 +
    Math.min(scoreData.pointsGap, 15) * 0.4 +
    Math.min(scoreData.strengthGap, 20) * 0.3;

  return Math.round(clamp(baseConfidence + bonus, 60, 92));
};

const isFixturePlayableForTips = (fixtureItem) => {
  const shortStatus = fixtureItem?.fixture?.status?.short?.toUpperCase() ?? "";
  return shortStatus === "NS" || shortStatus === "TBD";
};

const buildSmartPick = (fixtureItem, standingsMap) => {
  const homeId = fixtureItem?.teams?.home?.id;
  const awayId = fixtureItem?.teams?.away?.id;

  const homeRow = standingsMap.get(homeId) || null;
  const awayRow = standingsMap.get(awayId) || null;

  if (!homeRow || !awayRow) {
    return null;
  }

  const scoreData = calculateConfidenceScore({
    homeRow,
    awayRow,
    fixtureItem,
  });

  const decision = decidePrediction({
    ...scoreData,
    fixtureItem,
  });

  const confidence = buildConfidence(decision.baseConfidence, scoreData);
  const league = fixtureItem?.league || {};
  const fixture = fixtureItem?.fixture || {};
  const teams = fixtureItem?.teams || {};

  return {
    matchId: fixture.id ?? null,
    kickoffTimeUtc: fixture.date ?? null,
    timestamp: fixture.timestamp ?? null,
    league: {
      id: league.id ?? null,
      name: league.name ?? "",
      logoUrl: league.logo ?? null,
      country: league.country ?? "",
      season: league.season ?? null,
      round: league.round ?? null,
    },
    homeTeam: {
      id: teams.home?.id ?? null,
      name: teams.home?.name ?? "",
      logoUrl: teams.home?.logo ?? null,
    },
    awayTeam: {
      id: teams.away?.id ?? null,
      name: teams.away?.name ?? "",
      logoUrl: teams.away?.logo ?? null,
    },
    predictionType: decision.predictionType,
    predictionLabel: decision.predictionLabel,
    confidence,
    reasoning: {
      homeRank: homeRow.rank ?? null,
      awayRank: awayRow.rank ?? null,
      homePoints: homeRow.points ?? null,
      awayPoints: awayRow.points ?? null,
      homeForm: homeRow.form ?? "",
      awayForm: awayRow.form ?? "",
      rankGap: scoreData.rankGap,
      pointsGap: scoreData.pointsGap,
      strengthGap: Math.round(scoreData.strengthGap),
    },
  };
};

const buildSmart15Picks = (fixtures, standingsByLeague) => {
  const playableFixtures = (fixtures || []).filter(isFixturePlayableForTips);
  const picks = [];

  for (const fixtureItem of playableFixtures) {
    const leagueId = fixtureItem?.league?.id;
    const standingsRows = standingsByLeague.get(leagueId) || [];
    const standingsMap = buildStandingsMap(standingsRows);

    const pick = buildSmartPick(fixtureItem, standingsMap);

    if (pick) {
      picks.push(pick);
    }
  }

  picks.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }

    return (a.timestamp || 0) - (b.timestamp || 0);
  });

  return picks.slice(0, 15);
};

module.exports = {
  buildSmart15Picks,
};