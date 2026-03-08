const apiFootball = require("../config/apiFootball");
const { CACHE_TTL } = require("../config/cache");
const {
  getCacheItem,
  setCacheItem,
} = require("../utils/cache");
const {
  mapMatchesResponse,
  mapMatchDetailsResponse,
} = require("../mappers/matches.mapper");

const getTodayDateString = () => {
  return new Date().toISOString().split("T")[0];
};

const getMatchesCacheTtl = (date) => {
  const today = getTodayDateString();

  if (date === today) {
    return CACHE_TTL.MATCHES_TODAY;
  }

  return CACHE_TTL.MATCHES_OTHER_DAYS;
};

const getMatchesByDate = async (date) => {
  const cacheKey = `matches:${date}`;
  const cachedData = getCacheItem(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const response = await apiFootball.get("/fixtures", {
    params: { date },
  });

  const mappedData = mapMatchesResponse(response.data, date);

  setCacheItem(cacheKey, mappedData, getMatchesCacheTtl(date));

  return mappedData;
};

const getMatchDetailsById = async (matchId) => {
  const cacheKey = `match-details:${matchId}`;
  const cachedData = getCacheItem(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const fixtureResponse = await apiFootball.get("/fixtures", {
    params: { id: matchId },
  });

  const fixtureItem = fixtureResponse.data?.response?.[0];

  if (!fixtureItem) {
    throw new Error("Match not found.");
  }

  const homeId = fixtureItem.teams?.home?.id;
  const awayId = fixtureItem.teams?.away?.id;

  if (!homeId || !awayId) {
    throw new Error("Unable to build H2H teams.");
  }

  const h2hParam = `${homeId}-${awayId}`;

  const [
    eventsResponse,
    statisticsResponse,
    lineupsResponse,
    h2hResponse,
  ] = await Promise.all([
    apiFootball.get("/fixtures/events", {
      params: { fixture: matchId },
    }),
    apiFootball.get("/fixtures/statistics", {
      params: { fixture: matchId },
    }),
    apiFootball.get("/fixtures/lineups", {
      params: { fixture: matchId },
    }),
    apiFootball.get("/fixtures/headtohead", {
      params: { h2h: h2hParam },
    }),
  ]);

  const mappedData = mapMatchDetailsResponse({
    fixtureData: fixtureResponse.data,
    eventsData: eventsResponse.data,
    statisticsData: statisticsResponse.data,
    lineupsData: lineupsResponse.data,
    h2hData: h2hResponse.data,
  });

  setCacheItem(cacheKey, mappedData, CACHE_TTL.MATCH_DETAILS);

  return mappedData;
};

module.exports = {
  getMatchesByDate,
  getMatchDetailsById,
};