const POPULAR_LEAGUE_IDS = [
  39,   // Premier League
  140,  // La Liga
  135,  // Serie A
  78,   // Bundesliga
  61,   // Ligue 1
  2,    // Champions League
  3,    // Europa League
  1,    // World Cup
  4,    // Euro Championship
  48,   // FA Cup
];

const mapLeagueItem = (item) => {
  const league = item.league || {};
  const country = item.country || {};
  const seasons = item.seasons || [];

  const currentSeason =
    seasons.find((season) => season.current === true) ||
    seasons[seasons.length - 1] ||
    null;

  return {
    leagueId: league.id ?? null,
    leagueName: league.name ?? "",
    type: league.type ?? "",
    logoUrl: league.logo ?? null,
    country: {
      name: country.name ?? "",
      code: country.code ?? "",
      flagUrl: country.flag ?? null,
    },
    currentSeason: currentSeason
      ? {
          year: currentSeason.year ?? null,
          start: currentSeason.start ?? null,
          end: currentSeason.end ?? null,
          current: currentSeason.current ?? false,
        }
      : null,
  };
};

const mapLeaguesResponse = (apiResponse) => {
  const rawLeagues = apiResponse?.response || [];
  const mappedLeagues = rawLeagues
    .map(mapLeagueItem)
    .filter((league) => league.leagueId && league.leagueName);

  const uniqueMap = new Map();

  for (const league of mappedLeagues) {
    if (!uniqueMap.has(league.leagueId)) {
      uniqueMap.set(league.leagueId, league);
    }
  }

  const uniqueLeagues = Array.from(uniqueMap.values());

  const popularLeagues = uniqueLeagues.filter((league) =>
    POPULAR_LEAGUE_IDS.includes(league.leagueId)
  );

  const allLeagues = [...uniqueLeagues].sort((a, b) =>
    a.leagueName.localeCompare(b.leagueName)
  );

  return {
    favoriteLeagues: [],
    popularLeagues,
    allLeagues,
  };
};

module.exports = {
  mapLeaguesResponse,
};