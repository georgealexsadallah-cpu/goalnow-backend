const formatMatchStatus = (shortStatus, elapsed) => {
  if (!shortStatus) {
    return {
      code: "NS",
      label: "",
      minute: null,
    };
  }

  const status = String(shortStatus).toUpperCase();

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

  if (status === "PST") {
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

const formatDateLabel = (dateValue) => {
  if (!dateValue) return "";

  try {
    const date = new Date(dateValue);
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  } catch (_) {
    return "";
  }
};

const formatTimeLabel = (dateValue) => {
  if (!dateValue) return "";

  try {
    const date = new Date(dateValue);
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(date);
  } catch (_) {
    return "";
  }
};

const safeArray = (value) => {
  return Array.isArray(value) ? value : [];
};

const safeObject = (value) => {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
};

const mapFixtureToGoalNowMatch = (fixtureItem) => {
  const item = safeObject(fixtureItem);
  const fixture = safeObject(item.fixture);
  const league = safeObject(item.league);
  const teams = safeObject(item.teams);
  const goals = safeObject(item.goals);
  const score = safeObject(item.score);
  const statusInfo = safeObject(fixture.status);

  const mappedStatus = formatMatchStatus(statusInfo.short, statusInfo.elapsed);

  return {
    matchId: fixture.id ?? null,
    kickoffTimeUtc: fixture.date || null,
    timestamp: fixture.timestamp || null,
    timezone: fixture.timezone || "",
    venue: {
      id: fixture.venue?.id ?? null,
      name: fixture.venue?.name ?? "",
      city: fixture.venue?.city ?? "",
    },
    status: mappedStatus.code,
    statusLabel: mappedStatus.label,
    minute: mappedStatus.minute,
    attendance: fixture.attendance ?? null,
    homeTeam: {
      id: teams.home?.id ?? null,
      name: teams.home?.name ?? "",
      logoUrl: teams.home?.logo ?? null,
      winner: teams.home?.winner ?? null,
    },
    awayTeam: {
      id: teams.away?.id ?? null,
      name: teams.away?.name ?? "",
      logoUrl: teams.away?.logo ?? null,
      winner: teams.away?.winner ?? null,
    },
    score: {
      home: goals.home ?? null,
      away: goals.away ?? null,
      halftimeHome: score.halftime?.home ?? null,
      halftimeAway: score.halftime?.away ?? null,
      fulltimeHome: score.fulltime?.home ?? null,
      fulltimeAway: score.fulltime?.away ?? null,
      extratimeHome: score.extratime?.home ?? null,
      extratimeAway: score.extratime?.away ?? null,
      penaltyHome: score.penalty?.home ?? null,
      penaltyAway: score.penalty?.away ?? null,
    },
    league: {
      leagueId: league.id ?? null,
      leagueName: league.name ?? "",
      countryCode: league.country ?? "",
      countryName: league.country ?? "",
      leagueLogoUrl: league.logo ?? null,
      countryFlagUrl: league.flag ?? null,
      season: league.season ?? null,
      round: league.round ?? null,
    },
  };
};

const groupMatchesByLeague = (matches) => {
  const leagueMap = new Map();

  for (const match of safeArray(matches)) {
    const leagueId =
      match?.league?.leagueId || `unknown-${match?.league?.leagueName || "League"}`;

    if (!leagueMap.has(leagueId)) {
      leagueMap.set(leagueId, {
        leagueId: match?.league?.leagueId ?? null,
        leagueName: match?.league?.leagueName ?? "",
        countryCode: match?.league?.countryCode ?? "",
        leagueLogoUrl: match?.league?.leagueLogoUrl ?? null,
        countryFlagUrl: match?.league?.countryFlagUrl ?? null,
        matches: [],
      });
    }

    leagueMap.get(leagueId).matches.push({
      matchId: match?.matchId ?? null,
      kickoffTimeUtc: match?.kickoffTimeUtc ?? null,
      timestamp: match?.timestamp ?? null,
      status: match?.status ?? "",
      statusLabel: match?.statusLabel ?? "",
      minute: match?.minute ?? null,
      homeTeam: match?.homeTeam ?? {},
      awayTeam: match?.awayTeam ?? {},
      score: {
        home: match?.score?.home ?? null,
        away: match?.score?.away ?? null,
      },
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

  leagues.sort((a, b) => (a.leagueName || "").localeCompare(b.leagueName || ""));

  return leagues;
};

const mapMatchesResponse = (apiResponse, date) => {
  const fixtures = safeArray(apiResponse?.response);
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
  const item = safeObject(eventItem);
  const time = safeObject(item.time);

  const elapsed = time.elapsed ?? null;
  const extra = time.extra ?? null;

  return {
    time: {
      elapsed,
      extra,
      label: extra ? `${elapsed}+${extra}'` : elapsed ? `${elapsed}'` : "",
    },
    team: {
      id: item.team?.id ?? null,
      name: item.team?.name ?? "",
      logoUrl: item.team?.logo ?? null,
    },
    player: {
      id: item.player?.id ?? null,
      name: item.player?.name ?? "",
    },
    assist: {
      id: item.assist?.id ?? null,
      name: item.assist?.name ?? "",
    },
    type: item.type ?? "",
    detail: item.detail ?? "",
    comments: item.comments ?? null,
  };
};
const normalizeStatValue = (value) => {
  if (value === null || value === undefined) return null;
  return value;
};

const mapStatisticBlock = (statisticsResponse) => {
  const blocks = safeArray(statisticsResponse);
  const home = safeObject(blocks[0]);
  const away = safeObject(blocks[1]);

  const homeStats = safeArray(home.statistics);
  const awayStats = safeArray(away.statistics);

  const statMap = new Map();

  for (const stat of homeStats) {
    statMap.set(stat.type, {
      type: stat.type || "",
      home: normalizeStatValue(stat.value),
      away: null,
    });
  }

  for (const stat of awayStats) {
    if (statMap.has(stat.type)) {
      statMap.get(stat.type).away = normalizeStatValue(stat.value);
    } else {
      statMap.set(stat.type, {
        type: stat.type || "",
        home: null,
        away: normalizeStatValue(stat.value),
      });
    }
  }

  return {
    homeTeamId: home.team?.id ?? null,
    awayTeamId: away.team?.id ?? null,
    items: Array.from(statMap.values()),
  };
};

const mapLineup = (lineupItem) => {
  const item = safeObject(lineupItem);

  return {
    team: {
      id: item.team?.id ?? null,
      name: item.team?.name ?? "",
      logoUrl: item.team?.logo ?? null,
      colors: item.team?.colors ?? null,
    },
    formation: item.formation ?? "",
    coach: {
      id: item.coach?.id ?? null,
      name: item.coach?.name ?? "",
      photoUrl: item.coach?.photo ?? null,
    },
    startXI: safeArray(item.startXI).map((entry) => ({
      id: entry.player?.id ?? null,
      name: entry.player?.name ?? "",
      number: entry.player?.number ?? null,
      pos: entry.player?.pos ?? "",
      grid: entry.player?.grid ?? "",
      photoUrl: entry.player?.photo ?? null,
    })),
    substitutes: safeArray(item.substitutes).map((entry) => ({
      id: entry.player?.id ?? null,
      name: entry.player?.name ?? "",
      number: entry.player?.number ?? null,
      pos: entry.player?.pos ?? "",
      grid: entry.player?.grid ?? "",
      photoUrl: entry.player?.photo ?? null,
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
  const safeFixture = safeObject(fixture);

  return {
    competition: mappedCore.league.leagueName,
    leagueCountry: mappedCore.league.countryName,
    season: mappedCore.league.season,
    round: mappedCore.league.round,
    referee: safeFixture.referee ?? "",
    kickoffTimeUtc: mappedCore.kickoffTimeUtc,
    kickoffTimeLabel: formatTimeLabel(mappedCore.kickoffTimeUtc),
    matchDateLabel: formatDateLabel(mappedCore.kickoffTimeUtc),
    calendarLabel: mappedCore.kickoffTimeUtc
      ? `${formatDateLabel(mappedCore.kickoffTimeUtc)} • ${formatTimeLabel(
          mappedCore.kickoffTimeUtc
        )}`
      : "",
    timezone: safeFixture.timezone ?? mappedCore.timezone ?? "",
    status: mappedCore.status,
    statusLabel: mappedCore.statusLabel,
    minute: mappedCore.minute,
    attendance: mappedCore.attendance,
  };
};

const buildVenueContainer = (fixture, venueDetailsData) => {
  const safeFixture = safeObject(fixture);
  const venueResponse = safeObject(safeArray(venueDetailsData?.response)[0]);
  const venueApi = safeObject(venueResponse.venue && typeof venueResponse.venue === "object"
    ? venueResponse.venue
    : venueResponse);

  const weather =
    safeFixture.weather?.description ||
    safeFixture.weather?.main ||
    venueApi.weather ||
    "";

  return {
    id: safeFixture.venue?.id ?? null,
    name: venueApi.name ?? safeFixture.venue?.name ?? "",
    city: venueApi.city ?? safeFixture.venue?.city ?? "",
    capacity: venueApi.capacity ?? null,
    surface: venueApi.surface ?? "",
    weather: weather || "",
    imageUrl: venueApi.image || null,
  };
};

const buildStatsTab = (statistics) => {
  const safeStats = safeObject(statistics);

  return {
    firstHalf: [],
    secondHalf: [],
    overall: safeArray(safeStats.items),
  };
};

const buildPredictedLineup = (mappedCore) => {
  return {
    source: "goalnow",
    home: {
      team: mappedCore.homeTeam,
      formation: "4-2-3-1",
      startXI: [],
      substitutes: [],
    },
    away: {
      team: mappedCore.awayTeam,
      formation: "4-3-3",
      startXI: [],
      substitutes: [],
    },
  };
};

const buildLineupTab = (lineups, predictedLineup = null) => {
  const safeLineups = safeArray(lineups);
  const home = safeObject(safeLineups[0]);
  const away = safeObject(safeLineups[1]);

  const official = !!(
    (safeArray(home.startXI).length) ||
    (safeArray(away.startXI).length)
  );

  return {
    official,
    home,
    away,
    predicted: official ? null : predictedLineup,
  };
};

const buildH2HTab = (h2hMatches, currentMatchId) => {
  return safeArray(h2hMatches).filter((match) => match.matchId !== currentMatchId);
};
const mapTeamForm = (fixtures, teamId, currentMatchId) => {
  if (!Array.isArray(fixtures)) return [];

  return fixtures
    .filter((fixtureItem) => fixtureItem?.fixture?.id !== currentMatchId)
    .slice(0, 5)
    .map((fixtureItem) => {
      const mapped = mapFixtureToGoalNowMatch(fixtureItem);

      const isHome = mapped.homeTeam.id === teamId;
      const opponent = isHome ? mapped.awayTeam : mapped.homeTeam;
      const gf = isHome ? mapped.score.home : mapped.score.away;
      const ga = isHome ? mapped.score.away : mapped.score.home;

      let result = "D";
      if (gf != null && ga != null) {
        if (gf > ga) result = "W";
        else if (gf < ga) result = "L";
      }

      return {
        matchId: mapped.matchId,
        opponent,
        isHome,
        scoreLabel:
          mapped.score.home != null && mapped.score.away != null
            ? `${mapped.score.home}-${mapped.score.away}`
            : "-",
        result,
        kickoffTimeUtc: mapped.kickoffTimeUtc,
        kickoffDateLabel: formatDateLabel(mapped.kickoffTimeUtc),
        kickoffTimeLabel: formatTimeLabel(mapped.kickoffTimeUtc),
        status: mapped.status,
      };
    });
};

const extractStandingsRows = (standingsData) => {
  const leagueBlock = safeObject(safeArray(standingsData?.response)[0]?.league);
  const groups = safeArray(leagueBlock.standings);

  return groups.flatMap((group) => (Array.isArray(group) ? group : []));
};

const findStandingRow = (standingsData, teamId) => {
  const rows = extractStandingsRows(standingsData);
  return rows.find((row) => row.team?.id === teamId) || null;
};

const mapStandingRow = (row) => {
  if (!row) return null;

  return {
    teamId: row.team?.id ?? null,
    teamName: row.team?.name ?? "",
    teamLogoUrl: row.team?.logo ?? null,
    position: row.rank ?? null,
    played: row.all?.played ?? null,
    wins: row.all?.win ?? null,
    draws: row.all?.draw ?? null,
    losses: row.all?.lose ?? null,
    goalDifference: row.goalsDiff ?? null,
    points: row.points ?? null,
    form: row.form ?? "",
    description: row.description ?? "",
    group: row.group ?? "",
    status: row.status ?? "",
  };
};

const buildPositionComparison = ({
  standingsData,
  homeTeamId,
  awayTeamId,
  leagueName,
}) => {
  const rows = extractStandingsRows(standingsData);
  const mappedRows = rows.map(mapStandingRow).filter(Boolean);

  const homeRow = findStandingRow(standingsData, homeTeamId);
  const awayRow = findStandingRow(standingsData, awayTeamId);

  return {
    leagueName: leagueName || safeArray(standingsData?.response)[0]?.league?.name || "",
    tableRows: mappedRows,
    home: mapStandingRow(homeRow),
    away: mapStandingRow(awayRow),
  };
};

const mapTopScorerForTeam = (topScorersData, teamId) => {
  const players = safeArray(topScorersData?.response);
  const found = players.find((item) =>
    safeArray(item.statistics).some((stat) => stat.team?.id === teamId)
  );

  if (!found) return null;

  const stat =
    safeArray(found.statistics).find((s) => s.team?.id === teamId) || {};

  return {
    playerId: found.player?.id ?? null,
    playerName: found.player?.name ?? "",
    firstname: found.player?.firstname ?? "",
    lastname: found.player?.lastname ?? "",
    age: found.player?.age ?? null,
    photoUrl: found.player?.photo ?? null,
    teamId: stat.team?.id ?? null,
    teamName: stat.team?.name ?? "",
    goals: stat.goals?.total ?? null,
    assists: stat.goals?.assists ?? null,
    rating: stat.games?.rating ?? null,
    appearances: stat.games?.appearences ?? null,
  };
};

const buildInsights = ({
  mappedCore,
  homeForm,
  awayForm,
  h2h,
  positionComparison,
}) => {
  const insights = [];

  if (homeForm.length > 0) {
    const wins = homeForm.filter((item) => item.result === "W").length;
    insights.push(
      `${mappedCore.homeTeam.name} won ${wins} of their last ${homeForm.length} matches.`
    );
  }

  if (awayForm.length > 0) {
    const wins = awayForm.filter((item) => item.result === "W").length;
    insights.push(
      `${mappedCore.awayTeam.name} won ${wins} of their last ${awayForm.length} matches.`
    );
  }

  if (positionComparison?.home?.position && positionComparison?.away?.position) {
    insights.push(
      `${mappedCore.homeTeam.name} are ${positionComparison.home.position} in the table, while ${mappedCore.awayTeam.name} are ${positionComparison.away.position}.`
    );
  }

  if (safeArray(h2h).length > 0) {
    insights.push("Recent head-to-head results are available for this fixture.");
  }

  if (
    mappedCore.score.halftimeHome != null &&
    mappedCore.score.halftimeAway != null
  ) {
    insights.push(
      `Half-time score was ${mappedCore.score.halftimeHome}-${mappedCore.score.halftimeAway}.`
    );
  }

  return insights;
};
const mapMatchDetailsResponse = ({
  fixtureData,
  eventsData,
  statisticsData,
  lineupsData,
  h2hData,
  homeLastMatchesData,
  awayLastMatchesData,
  standingsData,
  topScorersData,
  venueDetailsData,
}) => {
  const fixtureItem = safeArray(fixtureData?.response)[0];

  if (!fixtureItem) {
    throw new Error("Match not found.");
  }

  const mappedCore = mapFixtureToGoalNowMatch(fixtureItem);
  const fixture = safeObject(fixtureItem.fixture);
  const events = safeArray(eventsData?.response).map(mapEvent);
  const statistics = mapStatisticBlock(safeArray(statisticsData?.response));
  const lineups = safeArray(lineupsData?.response).map(mapLineup);
  const h2h = safeArray(h2hData?.response).map(mapH2HMatch);

  const homeTeamId = mappedCore.homeTeam.id;
  const awayTeamId = mappedCore.awayTeam.id;

  const homeForm = mapTeamForm(
    safeArray(homeLastMatchesData?.response),
    homeTeamId,
    mappedCore.matchId
  );

  const awayForm = mapTeamForm(
    safeArray(awayLastMatchesData?.response),
    awayTeamId,
    mappedCore.matchId
  );

  const positionComparison = buildPositionComparison({
    standingsData,
    homeTeamId,
    awayTeamId,
    leagueName: mappedCore.league.leagueName,
  });

  const topScorers = {
    home: mapTopScorerForTeam(topScorersData, homeTeamId),
    away: mapTopScorerForTeam(topScorersData, awayTeamId),
  };

  const predictedLineup = buildPredictedLineup(mappedCore);

  return {
    header: {
      matchId: mappedCore.matchId,
      kickoffTimeUtc: mappedCore.kickoffTimeUtc,
      timestamp: mappedCore.timestamp,
      timezone: mappedCore.timezone,
      status: mappedCore.status,
      statusLabel: mappedCore.statusLabel,
      minute: mappedCore.minute,
      attendance: mappedCore.attendance,
      venue: mappedCore.venue,
      homeTeam: mappedCore.homeTeam,
      awayTeam: mappedCore.awayTeam,
      score: mappedCore.score,
      league: mappedCore.league,
    },
    preview: {
      overview: buildOverviewContainer(mappedCore, fixture),
      timeline: events,
      venue: buildVenueContainer(fixture, venueDetailsData),
      teamForm: {
        home: homeForm,
        away: awayForm,
      },
      positionComparison,
      topScorers,
      insights: buildInsights({
        mappedCore,
        homeForm,
        awayForm,
        h2h,
        positionComparison,
      }),
    },
    statsTab: buildStatsTab(statistics),
    lineupTab: buildLineupTab(lineups, predictedLineup),
    h2hTab: buildH2HTab(h2h, mappedCore.matchId),
    raw: {
      referee: fixture.referee ?? "",
      periods: fixture.periods ?? null,
      attendance: fixture.attendance ?? null,
      timezone: fixture.timezone ?? "",
      scoreBreakdown: mappedCore.score,
      events,
      statistics,
      lineups,
      h2h,
      venueDetails: safeArray(venueDetailsData?.response)[0] || null,
    },
  };
};

module.exports = {
  mapMatchesResponse,
  mapMatchDetailsResponse,
};