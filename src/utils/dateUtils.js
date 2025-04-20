const dayjs = require('dayjs');

exports.getDateRanges = (days) => {
  const end = dayjs().subtract(1, 'day');
  const start = end.subtract(days - 1, 'day');
  const prevEnd = start.subtract(1, 'day');
  const prevStart = prevEnd.subtract(days - 1, 'day');

  let granularity = 'daily';
  if (days === 90) granularity = 'weekly';
  if (days === 365) granularity = 'monthly';

  return {
    current: { start: start.format('YYYYMMDD00'), end: end.format('YYYYMMDD00') },
    previous: { start: prevStart.format('YYYYMMDD00'), end: prevEnd.format('YYYYMMDD00') },
    granularity
  };
};
