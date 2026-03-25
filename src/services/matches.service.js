const apiFootball = require("../config/apiFootball");
const { buildPrediction } = require("../utils/predictionEngine");
const { buildInsights } = require("../utils/insightsEngine");
const { CACHE_TTL } = require("../config/cache");
const { getCacheItem, setCacheItem } = require("../utils/cache");
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

const normalizeIdList = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => !Number.isNaN(item));
  }

  return String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item));
};

const buildMatchesCacheKey = (date, options = {}) => {
  const favoriteFixtureIds = normalizeIdList(options.favoriteFixtureIds).sort(
    (a, b) => a - b
  );
  const followedLeagueIds = normalizeIdList(options.followedLeagueIds).sort(
    (a, b) => a - b
  );

  const favoritesKey = favoriteFixtureIds.length
    ? favoriteFixtureIds.join("-")
    : "none";

  const followedKey = followedLeagueIds.length
    ? followedLeagueIds.join("-")
    : "none";

  return `matches:${date}:fav:${favoritesKey}:flw:${followedKey}`;
};

const getMatchesByDate = async (date, options = {}) => {
  const cacheKey = buildMatchesCacheKey(date, options);
  const cachedData = getCacheItem(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const response = await apiFootball.get("/fixtures", {
    params: { date },
  });

  const mappedData = mapMatchesResponse(response.data, date, {
    favoriteFixtureIds: normalizeIdList(options.favoriteFixtureIds),
    followedLeagueIds: normalizeIdList(options.followedLeagueIds),
  });

  setCacheItem(cacheKey, mappedData, getMatchesCacheTtl(date));

  return mappedData;
};

const safeGet = async (url, params = {}, fallback = { response: [] }) => {
  try {
    const response = await apiFootball.get(url, { params });
    return response?.data || fallback;
  } catch (error) {
    const status = error?.response?.status || "NO_STATUS";
    const message =
      error?.response?.data?.errors ||
      error?.response?.data?.message ||
      error?.message ||
      "Unknown API error";

    console.error(`[API-FOOTBALL FAIL] ${url}`, {
      status,
      params,
      message,
    });

    return fallback;
  }
};

const extractStandingRows = (standingsData) => {
  const leagueBlock = standingsData?.response?.[0]?.league;
  const groups = Array.isArray(leagueBlock?.standings)
    ? leagueBlock.standings
    : [];

  return groups.flatMap((group) => (Array.isArray(group) ? group : []));
};

const findStandingRow = (standingsData, teamId) => {
  const rows = extractStandingRows(standingsData);
  return rows.find((row) => row?.team?.id === teamId) || null;
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

  const homeId = fixtureItem.teams?.home?.id ?? null;
  const awayId = fixtureItem.teams?.away?.id ?? null;
  const leagueId = fixtureItem.league?.id ?? null;
  const season = fixtureItem.league?.season ?? null;
  const venueId = fixtureItem.fixture?.venue?.id ?? null;

  const h2hParam = homeId && awayId ? `${homeId}-${awayId}` : null;

  const [
    eventsData,
    statisticsData,
    lineupsData,
    h2hData,
    homeLastMatchesData,
    awayLastMatchesData,
    standingsData,
    topScorersData,
    venueDetailsData,
  ] = await Promise.all([
    safeGet("/fixtures/events", { fixture: matchId }, { response: [] }),
    safeGet("/fixtures/statistics", { fixture: matchId }, { response: [] }),
    safeGet("/fixtures/lineups", { fixture: matchId }, { response: [] }),
    h2hParam
      ? safeGet("/fixtures/headtohead", { h2h: h2hParam }, { response: [] })
      : Promise.resolve({ response: [] }),
    homeId
      ? safeGet("/fixtures", { team: homeId, last: 5 }, { response: [] })
      : Promise.resolve({ response: [] }),
    awayId
      ? safeGet("/fixtures", { team: awayId, last: 5 }, { response: [] })
      : Promise.resolve({ response: [] }),
    leagueId && season
      ? safeGet("/standings", { league: leagueId, season }, { response: [] })
      : Promise.resolve({ response: [] }),
    leagueId && season
      ? safeGet("/players/topscorers", { league: leagueId, season }, { response: [] })
      : Promise.resolve({ response: [] }),
    venueId
      ? safeGet("/venues", { id: venueId }, { response: [] })
      : Promise.resolve({ response: [] }),
  ]);

  const mappedData = mapMatchDetailsResponse({
    fixtureData: fixtureResponse.data || { response: [] },
    eventsData: eventsData || { response: [] },
    statisticsData: statisticsData || { response: [] },
    lineupsData: lineupsData || { response: [] },
    h2hData: h2hData || { response: [] },
    homeLastMatchesData: homeLastMatchesData || { response: [] },
    awayLastMatchesData: awayLastMatchesData || { response: [] },
    standingsData: standingsData || { response: [] },
    topScorersData: topScorersData || { response: [] },
    venueDetailsData: venueDetailsData || { response: [] },
  });

  let prediction;

  try {
    prediction = buildPrediction({
      fixture: fixtureItem,
      homeLastMatches: homeLastMatchesData?.response || [],
      awayLastMatches: awayLastMatchesData?.response || [],
      h2h: h2hData?.response || [],
      standings: standingsData?.response || [],
      statistics: statisticsData?.response || [],
    });
  } catch (error) {
    console.error("[PREDICTION ENGINE FAIL]", {
      matchId,
      message: error?.message || "Unknown prediction error",
    });

    prediction = {
      winner: "Balanced",
      confidence: "Low",
      goalsLean: "Under 2.5",
      btts: "No",
      risk: "High",
      scores: {
        home: 0,
        away: 0,
      },
      components: {
        form: { home: 0, away: 0 },
        table: { home: 0, away: 0 },
        goalTrend: { home: 0, away: 0 },
      },
      shortReason:
        "Available data is limited, so GoalNow is using a safe fallback.",
      h2hCount: 0,
      meta: {
        statisticsCount: 0,
        standingsAvailable: false,
      },
    };
  }

  try {
    const homeStandingRow = findStandingRow(standingsData, homeId);
    const awayStandingRow = findStandingRow(standingsData, awayId);

    mappedData.preview = mappedData.preview || {};
    mappedData.preview.insights = buildInsights({
      homeTeamName: fixtureItem.teams?.home?.name || "Home",
      awayTeamName: fixtureItem.teams?.away?.name || "Away",
      homeForm: mappedData?.preview?.teamForm?.home || [],
      awayForm: mappedData?.preview?.teamForm?.away || [],
      homeStandingRow,
      awayStandingRow,
      h2hMatches: mappedData?.h2hTab || [],
    });
  } catch (error) {
    console.error("[INSIGHTS ENGINE FAIL]", {
      matchId,
      message: error?.message || "Unknown insights error",
    });

    mappedData.preview = mappedData.preview || {};
    mappedData.preview.insights = [
      `${
        fixtureItem.teams?.home?.name || "Home"
      } are being assessed through GoalNow AI using recent form and matchup balance.`,
      `${
        fixtureItem.teams?.away?.name || "Away"
      } are being assessed through GoalNow AI using recent form and matchup balance.`,
      "GoalNow AI expects this match to be shaped by available form, goal trend, and head-to-head signals.",
    ];
  }

  const finalData = {
    ...mappedData,
    prediction,
  };

  setCacheItem(cacheKey, finalData, CACHE_TTL.MATCH_DETAILS);

  return finalData;
};

module.exports = {
  getMatchesByDate,
  getMatchDetailsById,
};