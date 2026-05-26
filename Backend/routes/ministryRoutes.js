const express = require('express');
const router = express.Router();
const ministryController = require('../controllers/ministryController');

router.get('/', ministryController.getMinistries);
router.post('/', ministryController.createMinistry);
router.delete('/:name', ministryController.deleteMinistry);

module.exports = router;
