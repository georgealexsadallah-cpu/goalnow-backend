const mapStandingRow = (row) => {
  return {
    rank: row.rank ?? null,
    team: {
      id: row.team?.id ?? null,
      name: row.team?.name ?? "",
      logoUrl: row.team?.logo ?? null,
    },
    points: row.points ?? null,
    goalDifference: row.goalsDiff ?? null,
    group: row.group ?? null,
    form: row.form ?? "",
    status: row.status ?? "",
    description: row.description ?? null,
    all: {
      played: row.all?.played ?? 0,
      win: row.all?.win ?? 0,
      draw: row.all?.draw ?? 0,
      lose: row.all?.lose ?? 0,
      goalsFor: row.all?.goals?.for ?? 0,
      goalsAgainst: row.all?.goals?.against ?? 0,
    },
    home: {
      played: row.home?.played ?? 0,
      win: row.home?.win ?? 0,
      draw: row.home?.draw ?? 0,
      lose: row.home?.lose ?? 0,
      goalsFor: row.home?.goals?.for ?? 0,
      goalsAgainst: row.home?.goals?.against ?? 0,
    },
    away: {
      played: row.away?.played ?? 0,
      win: row.away?.win ?? 0,
      draw: row.away?.draw ?? 0,
      lose: row.away?.lose ?? 0,
      goalsFor: row.away?.goals?.for ?? 0,
      goalsAgainst: row.away?.goals?.against ?? 0,
    },
    recentForm: row.form
      ? row.form.split("").map((item) => item.toUpperCase())
      : [],
  };
};

const mapStandingsResponse = (apiResponse, leagueId, season) => {
  const responseItem = apiResponse?.response?.[0];

  if (!responseItem) {
    return {
      league: {
        leagueId: Number(leagueId),
        leagueName: "",
        countryName: "",
        countryCode: "",
        countryFlagUrl: null,
        season: Number(season),
        logoUrl: null,
      },
      tables: [],
    };
  }

  const league = responseItem.league || {};
  const standingsGroups = league.standings || [];

  const tables = standingsGroups.map((groupRows, index) => {
    const mappedRows = (groupRows || []).map(mapStandingRow);

    const groupName =
      mappedRows.find((row) => row.group)?.group ||
      (standingsGroups.length > 1 ? `Group ${index + 1}` : "Table");

    return {
      groupName,
      rows: mappedRows,
    };
  });

  return {
    league: {
      leagueId: league.id ?? Number(leagueId),
      leagueName: league.name ?? "",
      countryName: league.country ?? "",
      countryCode: "",
      countryFlagUrl: league.flag ?? null,
      season: league.season ?? Number(season),
      logoUrl: league.logo ?? null,
    },
    tables,
  };
};

module.exports = {
  mapStandingsResponse,
};