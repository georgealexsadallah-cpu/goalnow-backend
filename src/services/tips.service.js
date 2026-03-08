const apiFootball = require("../config/apiFootball");
const { CACHE_TTL } = require("../config/cache");
const { getCacheItem, setCacheItem } = require("../utils/cache");
const {
  mapTipsResponse,
  mapGeneratedTipsResponse,
} = require("../mappers/tips.mapper");
const {
  buildSmart15Picks,
  buildCustomPicks,
} = require("./tips-engine.service");

const getTodayDate = () => {
  const now = new Date();
  return now.toISOString().split("T")[0];
};

const getLeagueStandingsRows = async (leagueId, season) => {
  try {
    const response = await apiFootball.get("/standings", {
      params: {
        league: leagueId,
        season,
      },
    });

    const standingsGroups = response.data?.response?.[0]?.league?.standings || [];

    return standingsGroups.flat();
  } catch (error) {
    return [];
  }
};

const buildStandingsByLeagueMap = async (fixtures) => {
  const uniqueLeagueSeasonKeys = new Map();

  for (const fixtureItem of fixtures || []) {
    const leagueId = fixtureItem?.league?.id;
    const season = fixtureItem?.league?.season;

    if (leagueId && season) {
      uniqueLeagueSeasonKeys.set(`${leagueId}:${season}`, {
        leagueId,
        season,
      });
    }
  }

  const entries = Array.from(uniqueLeagueSeasonKeys.values());

  const standingsResults = await Promise.all(
    entries.map(async (entry) => {
      const rows = await getLeagueStandingsRows(entry.leagueId, entry.season);

      return {
        leagueId: entry.leagueId,
        rows,
      };
    })
  );

  const standingsByLeague = new Map();

  for (const item of standingsResults) {
    standingsByLeague.set(item.leagueId, item.rows);
  }

  return standingsByLeague;
};

const fetchFixturesForDate = async (date) => {
  const response = await apiFootball.get("/fixtures", {
    params: { date },
  });

  return response.data?.response || [];
};

const getTodaysPicks = async () => {
  const date = getTodayDate();
  const cacheKey = `tips:smart15:${date}`;
  const cachedData = getCacheItem(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const fixtures = await fetchFixturesForDate(date);
  const standingsByLeague = await buildStandingsByLeagueMap(fixtures);
  const smartPicks = buildSmart15Picks(fixtures, standingsByLeague);
  const mappedData = mapTipsResponse(date, smartPicks);

  setCacheItem(cacheKey, mappedData, CACHE_TTL.TIPS);

  return mappedData;
};

const generatePicksByDate = async (date, count) => {
  const cacheKey = `tips:generate:${date}:${count}`;
  const cachedData = getCacheItem(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const fixtures = await fetchFixturesForDate(date);
  const standingsByLeague = await buildStandingsByLeagueMap(fixtures);
  const generatedPicks = buildCustomPicks(fixtures, standingsByLeague, count);
  const mappedData = mapGeneratedTipsResponse(date, count, generatedPicks);

  setCacheItem(cacheKey, mappedData, CACHE_TTL.TIPS);

  return mappedData;
};

module.exports = {
  getTodaysPicks,
  generatePicksByDate,
};