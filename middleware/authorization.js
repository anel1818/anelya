// middleware/authorization.js

function requireRole(role) {
    return function(req, res, next) {
      if (req.session && req.session.user && req.session.user.role === role) {
        next();
      } else {
        res.status(403).send('Access Denied');
      }
    };
  }
  
  module.exports = { requireRole };
  