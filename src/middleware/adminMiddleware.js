export const adminOnly = (req, res, next) => {
    if (req.user && req.user.accountType === 'Admin') {
      next(); // Allow access if the user is an Admin
    } else {
      res.status(403).json({ message: 'Access denied: Admins only' });
    }
  };