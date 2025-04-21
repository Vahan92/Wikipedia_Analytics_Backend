const express = require('express');
const cors = require('cors');
const apiRouter = require('./routes/api');

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const app = express();

app.use(cors({
  origin: (incomingOrigin, callback) => {
    if (!incomingOrigin) return callback(null, true);
    if (allowedOrigins.includes(incomingOrigin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS policy violation: ${incomingOrigin}`));
  },
  methods: ['GET','POST','PUT','DELETE'],
  credentials: true
}));

app.use(express.json());

app.use('/api', apiRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;