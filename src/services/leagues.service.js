const apiFootball = require("../config/apiFootball");
const { CACHE_TTL } = require("../config/cache");
const {
  getCacheItem,
  setCacheItem,
} = require("../utils/cache");
const { mapLeaguesResponse } = require("../mappers/leagues.mapper");

const getLeagues = async () => {
  const cacheKey = "leagues:all";
  const cachedData = getCacheItem(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const response = await apiFootball.get("/leagues");
  const mappedData = mapLeaguesResponse(response.data);

  setCacheItem(cacheKey, mappedData, CACHE_TTL.LEAGUES);

  return mappedData;
};

module.exports = {
  getLeagues,
};