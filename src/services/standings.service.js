const apiFootball = require("../config/apiFootball");
const { CACHE_TTL } = require("../config/cache");
const {
  getCacheItem,
  setCacheItem,
} = require("../utils/cache");
const { mapStandingsResponse } = require("../mappers/standings.mapper");

const getStandings = async (league, season) => {
  const cacheKey = `standings:${league}:${season}`;
  const cachedData = getCacheItem(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const response = await apiFootball.get("/standings", {
    params: {
      league,
      season,
    },
  });

  const mappedData = mapStandingsResponse(response.data, league, season);

  setCacheItem(cacheKey, mappedData, CACHE_TTL.STANDINGS);

  return mappedData;
};

module.exports = {
  getStandings,
};