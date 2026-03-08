const mapTeamItem = (item) => {
  const team = item.team || {};
  const venue = item.venue || {};

  return {
    id: team.id ?? null,
    name: team.name ?? "",
    code: team.code ?? "",
    country: team.country ?? "",
    founded: team.founded ?? null,
    logoUrl: team.logo ?? null,
    national: team.national ?? false,
    venue: {
      id: venue.id ?? null,
      name: venue.name ?? "",
      city: venue.city ?? "",
      capacity: venue.capacity ?? null,
    },
  };
};

const mapLeagueItem = (item) => {
  const league = item.league || {};
  const country = item.country || {};

  return {
    id: league.id ?? null,
    name: league.name ?? "",
    type: league.type ?? "",
    logoUrl: league.logo ?? null,
    country: {
      name: country.name ?? "",
      code: country.code ?? "",
      flagUrl: country.flag ?? null,
    },
  };
};

const mapFixtureItem = (fixtureItem) => {
  const fixture = fixtureItem.fixture || {};
  const league = fixtureItem.league || {};
  const teams = fixtureItem.teams || {};
  const goals = fixtureItem.goals || {};
  const status = fixture.status || {};

  return {
    matchId: fixture.id ?? null,
    kickoffTimeUtc: fixture.date ?? null,
    timestamp: fixture.timestamp ?? null,
    status: status.short ?? "",
    statusLabel: status.long ?? "",
    minute: status.elapsed ?? null,
    league: {
      id: league.id ?? null,
      name: league.name ?? "",
      logoUrl: league.logo ?? null,
      country: league.country ?? "",
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
    score: {
      home: goals.home ?? null,
      away: goals.away ?? null,
    },
  };
};

module.exports = {
  mapTeamItem,
  mapLeagueItem,
  mapFixtureItem,
};