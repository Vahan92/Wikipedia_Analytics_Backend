const cron = require('node-cron');
const { archiveCacheData } = require('../services/archiveService');

function scheduleCacheArchiving() {
  console.log('Setting up daily cache archiving job');
  
  cron.schedule('0 0 * * *', async () => {
    console.log(`Starting scheduled cache archiving job at ${new Date()}`);
    try {
      const results = await archiveCacheData();
      console.log(`Archive job completed: ${results.length} files archived`);
    } catch (error) {
      console.error('Error in scheduled archive job:', error);
    }
  });
}

module.exports = {
  scheduleCacheArchiving
};