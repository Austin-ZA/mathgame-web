// middleware/auth.js
function requireAuth(req, res, next) {
  if (!req.session?.user)
    return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  next();
}
module.exports = { requireAuth };
