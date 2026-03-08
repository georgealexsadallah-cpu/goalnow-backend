const Fuse = require("fuse.js");
const apiFootball = require("../config/apiFootball");
const { CACHE_TTL } = require("../config/cache");
const { getCacheItem, setCacheItem } = require("../utils/cache");
const {
  mapTeamItem,
  mapLeagueItem,
  mapFixtureItem,
} = require("../mappers/search.mapper");

const SEARCH_CACHE_TTL = 10 * 60 * 1000;

const TEAM_ALIAS_MAP = {
  "man u": "Manchester United",
  "man utd": "Manchester United",
  "man city": "Manchester City",
  "psg": "Paris Saint Germain",
  "barca": "Barcelona",
  "madrid": "Real Madrid",
  "inter": "Inter",
  "ac milan": "AC Milan",
  "atleti": "Atletico Madrid",
  "bayern": "Bayern Munich",
  "arsenl": "Arsenal",
  "liverpol": "Liverpool",
  "chelse": "Chelsea",
  "juve": "Juventus",
};

const normalizeQuery = (query) => {
  return String(query || "").trim().toLowerCase();
};

const resolveAlias = (query) => {
  const normalized = normalizeQuery(query);
  return TEAM_ALIAS_MAP[normalized] || query;
};

const buildFuse = (items, keys) => {
  return new Fuse(items, {
    keys,
    threshold: 0.35,
    ignoreLocation: true,
    includeScore: true,
  });
};

const searchTeams = async (query) => {
  const cacheKey = `search:teams:${normalizeQuery(query)}`;
  const cachedData = getCacheItem(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const aliasedQuery = resolveAlias(query);

  const response = await apiFootball.get("/teams", {
    params: {
      search: aliasedQuery,
    },
  });

  let teams = (response.data?.response || []).map(mapTeamItem);

  if (!teams.length && aliasedQuery !== query) {
    const fallbackResponse = await apiFootball.get("/teams", {
      params: {
        search: query,
      },
    });

    teams = (fallbackResponse.data?.response || []).map(mapTeamItem);
  }

  setCacheItem(cacheKey, teams, SEARCH_CACHE_TTL);

  return teams;
};

const searchLeagues = async (query) => {
  const cacheKey = `search:leagues:${normalizeQuery(query)}`;
  const cachedData = getCacheItem(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const response = await apiFootball.get("/leagues", {
    params: {
      search: query,
      current: true,
    },
  });

  const leagues = (response.data?.response || []).map(mapLeagueItem);

  setCacheItem(cacheKey, leagues, SEARCH_CACHE_TTL);

  return leagues;
};

const searchFixtures = async (query) => {
  const cacheKey = `search:fixtures:${normalizeQuery(query)}`;
  const cachedData = getCacheItem(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const today = new Date();
  const dateFrom = new Date(today);
  const dateTo = new Date(today);

  dateFrom.setDate(today.getDate() - 1);
  dateTo.setDate(today.getDate() + 15);

  const formatDate = (date) => date.toISOString().split("T")[0];

  const response = await apiFootball.get("/fixtures", {
    params: {
      from: formatDate(dateFrom),
      to: formatDate(dateTo),
    },
  });

  const fixtures = (response.data?.response || []).map(mapFixtureItem);

  const fuse = buildFuse(fixtures, [
    "homeTeam.name",
    "awayTeam.name",
    "league.name",
  ]);

  const searched = fuse.search(query).map((item) => item.item).slice(0, 10);

  setCacheItem(cacheKey, searched, SEARCH_CACHE_TTL);

  return searched;
};

const buildDidYouMean = (query, teams, leagues, fixtures) => {
  const candidatePool = [
    ...teams.map((item) => item.name),
    ...leagues.map((item) => item.name),
    ...fixtures.flatMap((item) => [item.homeTeam.name, item.awayTeam.name]),
  ].filter(Boolean);

  const uniqueCandidates = Array.from(new Set(candidatePool));

  if (!uniqueCandidates.length) {
    const aliased = resolveAlias(query);

    if (aliased !== query) {
      return aliased;
    }

    return null;
  }

  const fuse = buildFuse(
    uniqueCandidates.map((name) => ({ name })),
    ["name"]
  );

  const result = fuse.search(query)[0];

  if (!result || result.score > 0.45) {
    const aliased = resolveAlias(query);
    return aliased !== query ? aliased : null;
  }

  return result.item.name;
};

const sortTeams = (query, teams) => {
  const fuse = buildFuse(teams, ["name", "country", "code"]);
  return fuse.search(query).map((item) => item.item).slice(0, 10);
};

const sortLeagues = (query, leagues) => {
  const fuse = buildFuse(leagues, ["name", "country.name"]);
  return fuse.search(query).map((item) => item.item).slice(0, 10);
};

const searchAll = async (query) => {
  const [teamsRaw, leaguesRaw, fixtures] = await Promise.all([
    searchTeams(query),
    searchLeagues(query),
    searchFixtures(query),
  ]);

  const teams = sortTeams(query, teamsRaw);
  const leagues = sortLeagues(query, leaguesRaw);
  const didYouMean = buildDidYouMean(query, teams, leagues, fixtures);

  return {
    query,
    correctedQuery: didYouMean && didYouMean !== query ? didYouMean : null,
    teams,
    matches: fixtures,
    leagues,
  };
};

module.exports = {
  searchAll,
};