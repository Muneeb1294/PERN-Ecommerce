import jwt from "jsonwebtoken";

export const sendToken = (user, statusCode, message, res) => {
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.status(statusCode).cookie("token", token, {
        expires: new Date(Date.now() + process.env.COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000), // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: process.env.COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    }).json({
        success: true,
        user,
        message,
        token,
    });
}