const axios = require("axios");
const cache = require("./cacheService");
const { getDateRanges } = require("../utils/dateUtils");

const CONFIG = {
  BASE_URL: "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article",
  PROJECT: process.env.WIKI_PROJECT || "en.wikipedia.org",
  ACCESS: process.env.WIKI_ACCESS || "all-access",
  AGENT: process.env.WIKI_AGENT || "user",
  DEFAULT_PAGE: "Main_Page",
  REQUEST_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

const apiClient = axios.create({
  timeout: CONFIG.REQUEST_TIMEOUT,
  headers: {
    "User-Agent":
      "PageviewsClient/1.0 (vahan.kalenteryan.dev@gmail.com)",
  },
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function formatDateString(timestamp, format) {
  const year = timestamp.substring(0, 4);
  const month = timestamp.substring(4, 6);
  const day = timestamp.substring(6, 8);

  switch (format) {
    case "daily":
      return `${year}-${month}-${day}`;
    case "weekly":
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const startOfYear = new Date(date.getFullYear(), 0, 0);
      const diff = date - startOfYear;
      const dayOfYear = Math.floor(diff / (24 * 60 * 60 * 1000));
      const weekNumber = Math.floor(dayOfYear / 7) + 1;
      return `${year}-W${weekNumber.toString().padStart(2, "0")}`;
    case "monthly":
      return `${year}/${month}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

async function fetchDailyData(
  start,
  end,
  page = CONFIG.DEFAULT_PAGE,
  retryCount = CONFIG.RETRY_ATTEMPTS
) {
  const key = `views:${page}:${start}:${end}`;
  const cached = cache.get(key);

  if (cached) {
    return cached;
  }

  const url = `${CONFIG.BASE_URL}/${CONFIG.PROJECT}/${CONFIG.ACCESS}/${
    CONFIG.AGENT
  }/${encodeURIComponent(page)}/daily/${start}/${end}`;

  try {
    const resp = await apiClient.get(url);

    if (!resp.data || !resp.data.items) {
      throw new Error("Invalid API response format");
    }

    const items = resp.data.items.map((i) => ({
      timestamp: i.timestamp,
      views: i.views,
    }));

    cache.set(key, items);
    return items;
  } catch (error) {
    if (
      retryCount > 0 &&
      (error.code === "ECONNABORTED" || error.response?.status >= 500)
    ) {
      console.warn(
        `API request failed, retrying (${retryCount} attempts left): ${error.message}`
      );
      await delay(
        CONFIG.RETRY_DELAY * (CONFIG.RETRY_ATTEMPTS - retryCount + 1)
      );
      return fetchDailyData(start, end, page, retryCount - 1);
    }

    console.error(`Failed to fetch pageviews data: ${error.message}`);
    throw new Error(`Failed to fetch pageviews data: ${error.message}`);
  }
}

function groupDataByPeriod(data, periodType) {
  if (periodType === "daily") {
    return data.map((item) => ({
      date: formatDateString(item.timestamp, "daily"),
      views: item.views,
    }));
  }

  const periods = {};

  data.forEach((item) => {
    const periodKey = formatDateString(item.timestamp, periodType);

    if (!periods[periodKey]) {
      periods[periodKey] = { date: periodKey, views: 0, count: 0 };
    }

    periods[periodKey].views += item.views;
    periods[periodKey].count += 1;
  });

  return Object.values(periods).map((period) => ({
    date: period.date,
    views: Math.round(period.views / period.count),
  }));
}

async function fetchPageviews(periodDays, page = CONFIG.DEFAULT_PAGE) {
  let periodType;
  switch (periodDays) {
    case 30:
      periodType = "daily";
      break;
    case 90:
      periodType = "weekly";
      break;
    case 365:
    default:
      periodType = "monthly";
      break;
  }

  const { current, previous } = getDateRanges(periodDays);
  console.info(
    `Fetching ${periodType} data for page "${page}" (${periodDays} days)`
  );

  try {
    const [currentRawData, previousRawData] = await Promise.all([
      fetchDailyData(current.start, current.end, page),
      fetchDailyData(previous.start, previous.end, page),
    ]);

    const currentProcessed = groupDataByPeriod(currentRawData, periodType);
    const previousProcessed = groupDataByPeriod(previousRawData, periodType);

    return {
      current: currentProcessed,
      previous: previousProcessed,
      periodType,
    };
  } catch (error) {
    console.error(`Error fetching pageviews: ${error.message}`);
    throw error;
  }
}

async function fetchPageviewsMultiple(periodDays, pages) {
  const results = {};

  const promises = pages.map((page) =>
    fetchPageviews(periodDays, page)
      .then((data) => {
        results[page] = data;
        return { page, status: "fulfilled" };
      })
      .catch((error) => {
        console.error(
          `Failed to fetch data for page "${page}": ${error.message}`
        );
        return { page, status: "rejected", error: error.message };
      })
  );

  await Promise.allSettled(promises);
  return results;
}

module.exports = {
  fetchPageviews,
  fetchPageviewsMultiple,
  fetchDailyData,
  groupDataByPeriod,
};
