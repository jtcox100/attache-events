const express = require('express');
const router = express.Router();
const sessionsController = require('../controllers/sessionsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/event/:event_id', authenticate, sessionsController.getSessionsByEvent);
router.get('/:id', authenticate, sessionsController.getSession);
router.post('/bulk', authenticate, requireAdmin, sessionsController.bulkCreateSessions);
router.post('/', authenticate, requireAdmin, sessionsController.createSession);
router.put('/:id', authenticate, requireAdmin, sessionsController.updateSession);
router.delete('/:id/register', authenticate, sessionsController.cancelRegistration);
router.delete('/:id', authenticate, requireAdmin, sessionsController.deleteSession);
router.post('/:id/register', authenticate, sessionsController.registerForSession);

module.exports = router;
