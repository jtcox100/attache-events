const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

function requireAttendee(req, res, next) {
  if (req.user?.role !== 'attendee') return res.status(403).json({ error: 'Attendee access required' });
  next();
}

function requireMonitor(req, res, next) {
  if (req.user?.role !== 'monitor') return res.status(403).json({ error: 'Monitor access required' });
  next();
}

function requireVendor(req, res, next) {
  if (req.user?.role !== 'vendor') return res.status(403).json({ error: 'Vendor access required' });
  next();
}

function requireAdminOrAttendee(req, res, next) {
  if (!['admin', 'attendee'].includes(req.user?.role)) return res.status(403).json({ error: 'Access denied' });
  next();
}

module.exports = { authenticate, requireAdmin, requireAttendee, requireMonitor, requireVendor, requireAdminOrAttendee };
