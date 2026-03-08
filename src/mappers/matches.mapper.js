const formatMatchStatus = (shortStatus, elapsed) => {
  if (!shortStatus) {
    return {
      code: "NS",
      label: "",
      minute: null,
    };
  }

  const status = shortStatus.toUpperCase();

  if (status === "NS" || status === "TBD") {
    return {
      code: "NS",
      label: "",
      minute: null,
    };
  }

  if (["1H", "2H", "ET", "BT", "P", "LIVE"].includes(status)) {
    return {
      code: "LIVE",
      label: elapsed ? `${elapsed}'` : "0'",
      minute: elapsed || 0,
    };
  }

  if (status === "HT") {
    return {
      code: "HT",
      label: "HT",
      minute: null,
    };
  }

  if (["FT", "AET", "PEN"].includes(status)) {
    return {
      code: "FT",
      label: "FT",
      minute: null,
    };
  }

  if (["PST"].includes(status)) {
    return {
      code: "PST",
      label: "Postponed",
      minute: null,
    };
  }

  if (["CANC", "ABD", "AWD", "WO"].includes(status)) {
    return {
      code: "CANC",
      label: "Cancelled",
      minute: null,
    };
  }

  return {
    code: status,
    label: status,
    minute: null,
  };
};

const mapFixtureToGoalNowMatch = (fixtureItem) => {
  const fixture = fixtureItem.fixture || {};
  const league = fixtureItem.league || {};
  const teams = fixtureItem.teams || {};
  const goals = fixtureItem.goals || {};
  const statusInfo = fixture.status || {};

  const mappedStatus = formatMatchStatus(
    statusInfo.short,
    statusInfo.elapsed
  );

  return {
    matchId: fixture.id,
    kickoffTimeUtc: fixture.date || null,
    timestamp: fixture.timestamp || null,
    status: mappedStatus.code,
    statusLabel: mappedStatus.label,
    minute: mappedStatus.minute,
    homeTeam: {
      id: teams.home?.id || null,
      name: teams.home?.name || "",
      logoUrl: teams.home?.logo || null,
      winner: teams.home?.winner ?? null,
    },
    awayTeam: {
      id: teams.away?.id || null,
      name: teams.away?.name || "",
      logoUrl: teams.away?.logo || null,
      winner: teams.away?.winner ?? null,
    },
    score: {
      home: goals.home,
      away: goals.away,
    },
    league: {
      leagueId: league.id || null,
      leagueName: league.name || "",
      countryCode: league.country || "",
      leagueLogoUrl: league.logo || null,
      countryFlagUrl: league.flag || null,
      season: league.season || null,
      round: league.round || null,
    },
  };
};

const groupMatchesByLeague = (matches) => {
  const leagueMap = new Map();

  for (const match of matches) {
    const leagueId = match.league.leagueId || `unknown-${match.league.leagueName}`;

    if (!leagueMap.has(leagueId)) {
      leagueMap.set(leagueId, {
        leagueId: match.league.leagueId,
        leagueName: match.league.leagueName,
        countryCode: match.league.countryCode,
        leagueLogoUrl: match.league.leagueLogoUrl,
        countryFlagUrl: match.league.countryFlagUrl,
        matches: [],
      });
    }

    leagueMap.get(leagueId).matches.push({
      matchId: match.matchId,
      kickoffTimeUtc: match.kickoffTimeUtc,
      timestamp: match.timestamp,
      status: match.status,
      statusLabel: match.statusLabel,
      minute: match.minute,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      score: match.score,
    });
  }

  const leagues = Array.from(leagueMap.values());

  leagues.forEach((league) => {
    league.matches.sort((a, b) => {
      const timeA = a.timestamp || 0;
      const timeB = b.timestamp || 0;
      return timeA - timeB;
    });
  });

  leagues.sort((a, b) => a.leagueName.localeCompare(b.leagueName));

  return leagues;
};

const mapMatchesResponse = (apiResponse, date) => {
  const fixtures = apiResponse?.response || [];
  const mappedMatches = fixtures.map(mapFixtureToGoalNowMatch);
  const groupedLeagues = groupMatchesByLeague(mappedMatches);

  return {
    date,
    sections: [
      {
        type: "other",
        title: "Other leagues",
        collapsedByDefault: true,
        leagues: groupedLeagues,
      },
    ],
  };
};

const mapEvent = (eventItem) => {
  const elapsed = eventItem.time?.elapsed ?? null;
  const extra = eventItem.time?.extra ?? null;

  return {
    time: {
      elapsed,
      extra,
      label: extra ? `${elapsed}+${extra}'` : elapsed ? `${elapsed}'` : "",
    },
    team: {
      id: eventItem.team?.id ?? null,
      name: eventItem.team?.name ?? "",
      logoUrl: eventItem.team?.logo ?? null,
    },
    player: {
      id: eventItem.player?.id ?? null,
      name: eventItem.player?.name ?? "",
    },
    assist: {
      id: eventItem.assist?.id ?? null,
      name: eventItem.assist?.name ?? "",
    },
    type: eventItem.type ?? "",
    detail: eventItem.detail ?? "",
    comments: eventItem.comments ?? null,
  };
};

const normalizeStatValue = (value) => {
  if (value === null || value === undefined) return null;
  return value;
};

const mapStatisticBlock = (statisticsResponse) => {
  const blocks = statisticsResponse || [];
  const home = blocks[0] || null;
  const away = blocks[1] || null;

  const items = (home?.statistics || []).map((homeStat, index) => {
    const awayStat = away?.statistics?.[index];

    return {
      type: homeStat.type || awayStat?.type || "",
      home: normalizeStatValue(homeStat.value),
      away: normalizeStatValue(awayStat?.value ?? null),
    };
  });

  return {
    homeTeamId: home?.team?.id ?? null,
    awayTeamId: away?.team?.id ?? null,
    items,
  };
};

const mapLineup = (lineupItem) => {
  return {
    team: {
      id: lineupItem.team?.id ?? null,
      name: lineupItem.team?.name ?? "",
      logoUrl: lineupItem.team?.logo ?? null,
      colors: lineupItem.team?.colors ?? null,
    },
    formation: lineupItem.formation ?? "",
    coach: {
      id: lineupItem.coach?.id ?? null,
      name: lineupItem.coach?.name ?? "",
      photoUrl: lineupItem.coach?.photo ?? null,
    },
    startXI: (lineupItem.startXI || []).map((item) => ({
      id: item.player?.id ?? null,
      name: item.player?.name ?? "",
      number: item.player?.number ?? null,
      pos: item.player?.pos ?? "",
      grid: item.player?.grid ?? "",
    })),
    substitutes: (lineupItem.substitutes || []).map((item) => ({
      id: item.player?.id ?? null,
      name: item.player?.name ?? "",
      number: item.player?.number ?? null,
      pos: item.player?.pos ?? "",
      grid: item.player?.grid ?? "",
    })),
  };
};

const mapH2HMatch = (fixtureItem) => {
  const mapped = mapFixtureToGoalNowMatch(fixtureItem);

  return {
    matchId: mapped.matchId,
    kickoffTimeUtc: mapped.kickoffTimeUtc,
    timestamp: mapped.timestamp,
    status: mapped.status,
    statusLabel: mapped.statusLabel,
    minute: mapped.minute,
    homeTeam: mapped.homeTeam,
    awayTeam: mapped.awayTeam,
    score: mapped.score,
    league: mapped.league,
  };
};

const buildOverviewContainer = (mappedCore, fixture) => {
  return {
    competition: mappedCore.league.leagueName,
    round: mappedCore.league.round,
    referee: fixture.referee ?? "",
    kickoffTimeUtc: mappedCore.kickoffTimeUtc,
    status: mappedCore.status,
    statusLabel: mappedCore.statusLabel,
    minute: mappedCore.minute,
  };
};

const buildVenueContainer = (fixture) => {
  return {
    id: fixture.venue?.id ?? null,
    name: fixture.venue?.name ?? "",
    city: fixture.venue?.city ?? "",
  };
};

const buildStatsTab = (statistics) => {
  return {
    firstHalf: [],
    secondHalf: [],
    overall: statistics.items || [],
  };
};

const buildLineupTab = (lineups) => {
  const home = lineups[0] || null;
  const away = lineups[1] || null;

  return {
    home,
    away,
  };
};

const buildH2HTab = (h2hMatches, currentMatchId) => {
  return h2hMatches.filter((match) => match.matchId !== currentMatchId);
};

const mapMatchDetailsResponse = ({
  fixtureData,
  eventsData,
  statisticsData,
  lineupsData,
  h2hData,
}) => {
  const fixtureItem = fixtureData?.response?.[0];

  if (!fixtureItem) {
    throw new Error("Match not found.");
  }

  const mappedCore = mapFixtureToGoalNowMatch(fixtureItem);
  const fixture = fixtureItem.fixture || {};
  const events = (eventsData?.response || []).map(mapEvent);
  const statistics = mapStatisticBlock(statisticsData?.response || []);
  const lineups = (lineupsData?.response || []).map(mapLineup);
  const h2h = (h2hData?.response || []).map(mapH2HMatch);

  return {
    header: {
      matchId: mappedCore.matchId,
      kickoffTimeUtc: mappedCore.kickoffTimeUtc,
      timestamp: mappedCore.timestamp,
      status: mappedCore.status,
      statusLabel: mappedCore.statusLabel,
      minute: mappedCore.minute,
      homeTeam: mappedCore.homeTeam,
      awayTeam: mappedCore.awayTeam,
      score: mappedCore.score,
      league: mappedCore.league,
    },
    preview: {
      overview: buildOverviewContainer(mappedCore, fixture),
      timeline: events,
      venue: buildVenueContainer(fixture),
    },
    statsTab: buildStatsTab(statistics),
    lineupTab: buildLineupTab(lineups),
    h2hTab: buildH2HTab(h2h, mappedCore.matchId),
    raw: {
      referee: fixture.referee ?? "",
      periods: fixture.periods ?? null,
      events,
      statistics,
      lineups,
      h2h,
    },
  };
};

module.exports = {
  mapMatchesResponse,
  mapMatchDetailsResponse,
};