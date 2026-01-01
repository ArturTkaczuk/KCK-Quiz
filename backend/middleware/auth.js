const db = require('../db');

const checkAuth = async (req, res, next) => {
    const userId = req.cookies.User;

    // console.log(`DEBUG: checkAuth. Cookie: ${userId}`);

    if (!userId) {
        console.log('DEBUG: Unauthorized - No User cookie');
        return res.status(403).json({ error: 'Unauthorized: No User cookie found' });
    }

    try {
        const user = await db.getUserById(userId);

        if (!user) {
            console.log(`DEBUG: Unauthorized - User ${userId} not found in DB`);
            return res.status(403).json({ error: 'Unauthorized: Invalid User' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
    }
    next();
};

module.exports = { checkAuth, requireAdmin };
