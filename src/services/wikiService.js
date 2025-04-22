const axios = require("axios");
const cache = require("./cacheService");
const { getDateRanges } = require("../utils/dateUtils");

const BASE_URL =
  "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article";
const PROJECT = process.env.WIKI_PROJECT;
const ACCESS = process.env.WIKI_ACCESS;
const AGENT = process.env.WIKI_AGENT;

async function fetchDailyData(start, end) {
  const key = `views:${start}:${end}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const url = `${BASE_URL}/${PROJECT}/${ACCESS}/${AGENT}/${encodeURIComponent(
    "Main_Page"
  )}/daily/${start}/${end}`;
  const resp = await axios.get(url);
  const items = resp.data.items.map((i) => ({
    timestamp: i.timestamp,
    views: i.views,
  }));
  cache.set(key, items);
  return items;
}

function groupByWeek(data) {
  const weeks = {};
  data.forEach((item) => {
    const date = new Date(
      parseInt(item.timestamp.slice(0, 4)),
      parseInt(item.timestamp.slice(4, 6)) - 1,
      parseInt(item.timestamp.slice(6, 8))
    );
    const startOfYear = new Date(date.getFullYear(), 0, 0);
    const diff = date - startOfYear;
    const dayOfYear = Math.floor(diff / (24 * 60 * 60 * 1000));
    const weekNumber = Math.floor(dayOfYear / 7) + 1;
    const weekKey = `${date.getFullYear()}-W${weekNumber
      .toString()
      .padStart(2, "0")}`;

    if (!weeks[weekKey]) weeks[weekKey] = { date: weekKey, views: 0, count: 0 };
    weeks[weekKey].views += item.views;
    weeks[weekKey].count += 1;
  });

  return Object.values(weeks).map((w) => ({
    date: w.date,
    views: Math.round(w.views / w.count),
  }));
}

function groupByMonth(data) {
  const months = {};
  data.forEach((item) => {
    const yearMonth = `${item.timestamp.slice(0, 4)}/${item.timestamp.slice(
      4,
      6
    )}`;
    if (!months[yearMonth])
      months[yearMonth] = { date: yearMonth, views: 0, count: 0 };
    months[yearMonth].views += item.views;
    months[yearMonth].count += 1;
  });

  return Object.values(months).map((m) => ({
    date: m.date,
    views: Math.round(m.views / m.count),
  }));
}

function convertDailyData(data) {
  return data.map((item) => {
    const year = item.timestamp.substring(0, 4);
    const month = item.timestamp.substring(4, 6);
    const day = item.timestamp.substring(6, 8);

    const dateString = `${year}-${month}-${day}`;

    return {
      date: dateString,
      views: item.views,
    };
  });
}

exports.fetchPageviews = async (periodDays) => {
  const { current, previous } = getDateRanges(periodDays);
  console.info("current .... ", current);
  const [currRaw, prevRaw] = await Promise.all([
    fetchDailyData(current.start, current.end),
    fetchDailyData(previous.start, previous.end),
  ]);

  let currProcessed, prevProcessed;
  if (periodDays === 30) {
    currProcessed = convertDailyData(currRaw);
    prevProcessed = convertDailyData(prevRaw);
  } else if (periodDays === 90) {
    currProcessed = groupByWeek(currRaw);
    prevProcessed = groupByWeek(prevRaw);
  } else if (periodDays === 365) {
    currProcessed = groupByMonth(currRaw);
    prevProcessed = groupByMonth(prevRaw);
  }

  return { current: currProcessed, previous: prevProcessed };
};
