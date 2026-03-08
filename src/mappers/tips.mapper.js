const randomConfidence = () => {
  return Math.floor(Math.random() * 30) + 60;
};

const buildPrediction = (homeGoals, awayGoals) => {
  if (homeGoals === null || awayGoals === null) {
    return "Match Winner";
  }

  if (homeGoals > awayGoals) {
    return "Home Win";
  }

  if (awayGoals > homeGoals) {
    return "Away Win";
  }

  return "Draw";
};

const mapPick = (fixtureItem) => {
  const fixture = fixtureItem.fixture || {};
  const teams = fixtureItem.teams || {};
  const goals = fixtureItem.goals || {};
  const league = fixtureItem.league || {};

  return {
    matchId: fixture.id,
    kickoffTimeUtc: fixture.date,
    league: {
      id: league.id,
      name: league.name,
      logoUrl: league.logo,
    },
    homeTeam: {
      id: teams.home?.id,
      name: teams.home?.name,
      logoUrl: teams.home?.logo,
    },
    awayTeam: {
      id: teams.away?.id,
      name: teams.away?.name,
      logoUrl: teams.away?.logo,
    },
    prediction: buildPrediction(goals.home, goals.away),
    confidence: randomConfidence(),
  };
};

const mapTipsResponse = (apiResponse, date) => {
  const fixtures = apiResponse?.response || [];

  const picks = fixtures
    .slice(0, 10)
    .map(mapPick)
    .sort((a, b) => b.confidence - a.confidence);

  return {
    date,
    picks,
  };
};

module.exports = {
  mapTipsResponse,
};