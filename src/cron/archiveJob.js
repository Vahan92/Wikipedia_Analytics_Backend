const cron = require('node-cron');
const wikiService = require('../services/wikiService');
const s3Service = require('../services/s3Service');

const schedule = process.env.CRON_SCHEDULE || '0 0 * * *';

module.exports = {
  start: () => {
    cron.schedule(schedule, async () => {
      try {
        const data = await wikiService.fetchPageviews(30);
        const key = `views_${new Date().toISOString().slice(0,10)}.json`;
        await s3Service.uploadArchive(key, data);
        console.log(`Archived data to S3 as ${key}`);
      } catch (err) {
        console.error('Archive job failed:', err);
      }
    }, { timezone: 'UTC' });
  }
};
