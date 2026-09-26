const admin_check = (req, res, next) => {

    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Please login first."
        });
    }

    if (req.session.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "You do not have permission to perform this action."
        });
    }

    next();
};

module.exports = admin_check ; 