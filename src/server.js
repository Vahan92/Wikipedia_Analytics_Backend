require('dotenv').config();
const app = require('./app');
const { scheduleCacheArchiving } = require('./cron/archiveCron');

const PORT = process.env.PORT || 4060;

scheduleCacheArchiving();

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});