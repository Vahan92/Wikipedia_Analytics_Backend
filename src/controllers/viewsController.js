const wikiService = require('../services/wikiService');

exports.getViews = async (req, res, next) => {
  try {
    const period = parseInt(req.query.period, 10);
    if (![30, 90, 365].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }
    const data = await wikiService.fetchPageviews(period);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
