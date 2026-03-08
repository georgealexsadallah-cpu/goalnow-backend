const apiFootball = require("../config/apiFootball");
const { CACHE_TTL } = require("../config/cache");
const {
  getCacheItem,
  setCacheItem,
} = require("../utils/cache");
const { mapTipsResponse } = require("../mappers/tips.mapper");

const getTodayDate = () => {
  const now = new Date();
  return now.toISOString().split("T")[0];
};

const getTodaysPicks = async () => {
  const date = getTodayDate();
  const cacheKey = `tips:${date}`;
  const cachedData = getCacheItem(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const response = await apiFootball.get("/fixtures", {
    params: { date },
  });

  const mappedData = mapTipsResponse(response.data, date);

  setCacheItem(cacheKey, mappedData, CACHE_TTL.TIPS);

  return mappedData;
};

module.exports = {
  getTodaysPicks,
};