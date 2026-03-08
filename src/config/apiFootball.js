const axios = require("axios");

const apiFootball = axios.create({
  baseURL: process.env.API_FOOTBALL_BASE_URL,
  headers: {
    "x-apisports-key": process.env.API_FOOTBALL_KEY,
  },
  timeout: 10000,
});

module.exports = apiFootball;