const votesStore = new Map();

const ensureMatchEntry = (matchId) => {
  if (!votesStore.has(matchId)) {
    votesStore.set(matchId, {
      votesByUser: new Map(),
    });
  }

  return votesStore.get(matchId);
};

const getUserVoteForMatch = (matchId, voterId) => {
  const entry = votesStore.get(matchId);

  if (!entry) {
    return null;
  }

  return entry.votesByUser.get(voterId) || null;
};

const upsertVote = ({ matchId, voterId, choice }) => {
  const entry = ensureMatchEntry(matchId);

  entry.votesByUser.set(voterId, choice);
};

const getVotesForMatch = (matchId) => {
  const entry = votesStore.get(matchId);

  if (!entry) {
    return {
      home: 0,
      draw: 0,
      away: 0,
    };
  }

  const totals = {
    home: 0,
    draw: 0,
    away: 0,
  };

  for (const choice of entry.votesByUser.values()) {
    if (choice === "home") totals.home += 1;
    if (choice === "draw") totals.draw += 1;
    if (choice === "away") totals.away += 1;
  }

  return totals;
};

module.exports = {
  getUserVoteForMatch,
  upsertVote,
  getVotesForMatch,
};