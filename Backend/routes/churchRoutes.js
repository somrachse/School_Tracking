const express = require('express');
const router = express.Router();
const churchController = require('../controllers/churchController');

router.get('/', churchController.getChurches);
router.post('/', churchController.createChurch);
router.delete('/:name', churchController.deleteChurch);

module.exports = router;
