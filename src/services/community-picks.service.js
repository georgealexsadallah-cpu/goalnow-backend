const apiFootball = require("../config/apiFootball");
const { CACHE_TTL } = require("../config/cache");
const { getCacheItem, setCacheItem } = require("../utils/cache");
const {
  getVotesForMatch,
  upsertVote,
  getUserVoteForMatch,
} = require("../utils/community-votes.store");

const COMMUNITY_MAX_MATCHES = 15;
const COMMUNITY_MIN_MATCHES = 10;

const isPlayableFixture = (fixtureItem) => {
  const shortStatus = fixtureItem?.fixture?.status?.short?.toUpperCase() ?? "";
  return shortStatus === "NS" || shortStatus === "TBD";
};

const fetchFixturesForDate = async (date) => {
  const response = await apiFootball.get("/fixtures", {
    params: { date },
  });

  return response.data?.response || [];
};

const buildCommunityMatches = (fixtures, voterId = null) => {
  const playableFixtures = (fixtures || [])
    .filter(isPlayableFixture)
    .sort((a, b) => {
      const timeA = a?.fixture?.timestamp ?? 0;
      const timeB = b?.fixture?.timestamp ?? 0;
      return timeA - timeB;
    });

  const limitedFixtures = playableFixtures.slice(
    0,
    Math.max(COMMUNITY_MIN_MATCHES, COMMUNITY_MAX_MATCHES)
  );

  return limitedFixtures.map((fixtureItem) => {
    const fixture = fixtureItem?.fixture || {};
    const league = fixtureItem?.league || {};
    const teams = fixtureItem?.teams || {};
    const matchId = fixture.id ?? null;
    const votes = getVotesForMatch(matchId);

    const homeVotes = votes.home;
    const drawVotes = votes.draw;
    const awayVotes = votes.away;
    const totalVotes = homeVotes + drawVotes + awayVotes;

    const percentage = (value) => {
      if (totalVotes === 0) {
        return 0;
      }

      return Math.round((value / totalVotes) * 100);
    };

    return {
      matchId,
      kickoffTimeUtc: fixture.date ?? null,
      timestamp: fixture.timestamp ?? null,
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
      options: [
        {
          key: "home",
          label: `${teams.home?.name ?? "Home"} Win`,
          votes: homeVotes,
          percentage: percentage(homeVotes),
        },
        {
          key: "draw",
          label: "Draw",
          votes: drawVotes,
          percentage: percentage(drawVotes),
        },
        {
          key: "away",
          label: `${teams.away?.name ?? "Away"} Win`,
          votes: awayVotes,
          percentage: percentage(awayVotes),
        },
      ],
      totalVotes,
      userVote: voterId ? getUserVoteForMatch(matchId, voterId) : null,
      votingClosed: false,
    };
  });
};

const getCommunityPicksByDate = async (date, voterId = null) => {
  const cacheKey = `tips:community:fixtures:${date}`;
  let fixtures = getCacheItem(cacheKey);

  if (!fixtures) {
    fixtures = await fetchFixturesForDate(date);
    setCacheItem(cacheKey, fixtures, CACHE_TTL.TIPS);
  }

  return {
    date,
    title: "GoalNow Community Picks",
    description:
      "Vote the most likely result for each match: Home Win, Draw, or Away Win.",
    matches: buildCommunityMatches(fixtures, voterId),
  };
};

const submitVote = async ({ matchId, voterId, choice }) => {
  upsertVote({
    matchId,
    voterId,
    choice,
  });

  const votes = getVotesForMatch(matchId);
  const totalVotes = votes.home + votes.draw + votes.away;

  const percentage = (value) => {
    if (totalVotes === 0) {
      return 0;
    }

    return Math.round((value / totalVotes) * 100);
  };

  return {
    matchId,
    voterId,
    selectedChoice: choice,
    summary: {
      totalVotes,
      home: {
        votes: votes.home,
        percentage: percentage(votes.home),
      },
      draw: {
        votes: votes.draw,
        percentage: percentage(votes.draw),
      },
      away: {
        votes: votes.away,
        percentage: percentage(votes.away),
      },
    },
  };
};

module.exports = {
  getCommunityPicksByDate,
  submitVote,
};