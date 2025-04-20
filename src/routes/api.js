const { Router } = require('express');
const { getViews } = require('../controllers/viewsController');
const router = Router();

router.get('/get_views', getViews);

module.exports = router;
