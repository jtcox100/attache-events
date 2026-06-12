const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/admin/login', authController.adminLogin);
router.post('/attendee/login', authController.attendeeLogin);
router.post('/attendee/set-password', authController.attendeeSetPassword);
router.post('/monitor/login', authController.monitorLogin);
router.post('/vendor/login', authController.vendorLogin);
router.post('/vendor/register', authController.vendorRegister);
router.get('/verify', authenticate, authController.verifyToken);

module.exports = router;
