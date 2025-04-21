require('dotenv').config();
const app = require('./app');
const archiveJob = require('./cron/archiveJob');

const PORT = process.env.PORT || 4060;

archiveJob.start();

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});