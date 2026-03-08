const mapTipsResponse = (date, picks) => {
  return {
    date,
    title: "GoalNow Smart 15",
    description:
      "Today’s best-selected picks based on standings, form, and match strength.",
    picks,
  };
};

module.exports = {
  mapTipsResponse,
};