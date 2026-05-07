// middleware/auth.js

function requireAuth(req, res, next) {
  if (!req.session?.user)
    return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.user)
    return res.status(401).json({ error: 'Not authenticated.' });
  if (req.session.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin access required.' });
  next();
}

function requireEducator(req, res, next) {
  if (!req.session?.user)
    return res.status(401).json({ error: 'Not authenticated.' });
  const role = req.session.user.role;
  if (role !== 'educator' && role !== 'admin')
    return res.status(403).json({ error: 'Educator access required.' });
  next();
}

module.exports = { requireAuth, requireAdmin, requireEducator };
