const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

router.get('/', studentController.getStudents);
router.get('/:id', studentController.getStudentById);
router.post('/', studentController.createStudent);
router.put('/:id', studentController.updateStudent);
router.post('/bulk', studentController.bulkCreateStudents);
router.delete('/:id', studentController.deleteStudent);
router.delete('/', studentController.deleteAllStudents);

module.exports = router;
