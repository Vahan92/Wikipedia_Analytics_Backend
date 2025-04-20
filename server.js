require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRouter = require('./src/routes/api');
const archiveJob = require('./src/cron/archiveJob');

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());
app.use('/api', apiRouter);

archiveJob.start();

const PORT = process.env.PORT || 4060;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});