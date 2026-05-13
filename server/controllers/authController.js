import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import database from "../database/db.js";
import bcrypt from "bcrypt";
import { sendToken } from "../utils/jwtToken.js";
import { generateResetPasswordToken } from "../utils/generateResetPasswordToken.js";
import { generateForgotPasswordEmailTemplate } from "../utils/generateForgotPasswordEmailTemplate.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";

export const register = catchAsyncError(async (req, res, next) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return next(new ErrorHandler("Please enter all required fields", 400));
    }

    if (password.length < 8 || password.length > 16) {
        return next(new ErrorHandler("Password must be between 8 and 16 characters long", 400));
    }

    const isAlreadyRegistered = await database.query(
        "SELECT * FROM users WHERE email = $1",
        [email],
    );
    if (isAlreadyRegistered.rows.length > 0) {
        return next(new ErrorHandler("User already exists", 400));
    }
    const defaultRole = "user";
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await database.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *",
        [name, email, hashedPassword, defaultRole],
    );
    res.status(201).json({
        success: true,
        user: user.rows[0],
    });
});

export const login = catchAsyncError(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(new ErrorHandler("Please enter all required fields", 400));
    }
    const user = await database.query("SELECT * FROM users WHERE email = $1", [
        email,
    ]);
    if (!user.rows.length) {
        return next(new ErrorHandler("User not found", 404));
    }
    const isPasswordCorrect = await bcrypt.compare(
        password,
        user.rows[0].password,
    );
    if (!isPasswordCorrect) {
        return next(new ErrorHandler("Invalid password", 400));
    }
    sendToken(user.rows[0], 200, "User logged in successfully", res);
});

export const getUser = catchAsyncError(async (req, res, next) => {
    const { user } = req;
    res.status(200).json({
        success: true,
        user,
    });
});

export const forgotPassword = catchAsyncError(async (req, res, next) => {
    const { email } = req.body;
    const frontendUrl = req.query.frontendUrl || process.env.FRONTEND_URL;
    if (!email) {
        return next(new ErrorHandler("Email is required", 400));
    }
    if (!frontendUrl) {
        return next(new ErrorHandler("FRONTEND_URL is not configured", 500));
    }
    let userResult = await database.query(
        "SELECT * FROM users WHERE email = $1",
        [email],
    );
    if (!userResult.rows.length) {
        return next(new ErrorHandler("User not found", 404));
    }
    const user = userResult.rows[0];
    const { resetToken, hashedResetToken, resetPasswordExpireTime } =
        generateResetPasswordToken();
    await database.query(
        "UPDATE users SET reset_password_token = $1, reset_password_expires = to_timestamp($2) WHERE email = $3",
        [hashedResetToken, resetPasswordExpireTime / 1000, email],
    );
    const resetPasswordUrl = `${frontendUrl}/password/reset?token=${resetToken}`;
    const message = generateForgotPasswordEmailTemplate(resetPasswordUrl);
    try {
        await sendEmail(user.email, "Reset Password", message);
        res.status(200).json({
            success: true,
            message: `Email sent to ${user.email} successfully`,
        });
    }
    catch (error) {
        await database.query("UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE email = $1", [email]);
        return next(new ErrorHandler("Failed to send email", 500));
    }
});

export const resetPassword = catchAsyncError(async (req, res, next) => {
    const { token } = req.body;
    const resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await database.query("SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()", [resetPasswordToken]);

    if (!user.rows.length) {
        return next(new ErrorHandler("Invalid or expired token", 400));
    }

    if (req.body.password !== req.body.confirmPassword) {
        return next(new ErrorHandler("Password and confirm password do not match", 400));
    }

    if (req.body.password.length < 8 || req.body.password.length > 16 || req.body.confirmPassword.length < 8 || req.body.confirmPassword.length > 16) {
        return next(new ErrorHandler("Password must be between 8 and 16 characters long", 400));
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const updatedUser = await database.query("UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2 RETURNING *", [hashedPassword, user.rows[0].id]);
    if (!updatedUser.rows.length) {
        return next(new ErrorHandler("Failed to update password", 500));
    }
    res.status(200).json({
        success: true,
        message: "Password reset successfully",
    });
});

export const updatePassword = catchAsyncError(async (req, res, next) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        return next(new ErrorHandler("Please enter all required fields", 400));
    }
    if (newPassword !== confirmNewPassword) {
        return next(new ErrorHandler("New password and confirm new password do not match", 400));
    }
    if (newPassword.length < 8 || newPassword.length > 16 || confirmNewPassword.length < 8 || confirmNewPassword.length > 16) {
        return next(new ErrorHandler("Password must be between 8 and 16 characters long", 400));
    }
    const isPasswordMatch = await bcrypt.compare(currentPassword, req.user.password);
    if (!isPasswordMatch) {
        return next(new ErrorHandler("Current password is incorrect", 400));
    }
    if (newPassword !== confirmNewPassword) {
        return next(new ErrorHandler("New password and confirm new password do not match", 400));
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await database.query("UPDATE users SET password = $1 WHERE id = $2 RETURNING *", [hashedNewPassword, req.user.id]);
    if (!updatedUser.rows.length) {
        return next(new ErrorHandler("Failed to update password", 500));
    }
    res.status(200).json({
        success: true,
        message: "Password updated successfully",
    });
});

export const updateProfile = catchAsyncError(async (req, res, next) => {
    const { name, email } = req.body;
    if (!name || !email) {
        return next(new ErrorHandler("Please enter all required fields", 400));
    }

    if (name.trim().length === 0 || email.trim().length === 0) {
        return next(new ErrorHandler("Name and email cannot be empty", 400));
    }

    let avatarData = {};
    if (req.files && req.files.avatar) {
        const { avatar } = req.files;
        if (req.user?.avatar?.public_id) {
            await cloudinary.uploader.destroy(req.user.avatar.public_id);
        }
        const newProfileImage = await cloudinary.uploader.upload(avatar.tempFilePath, {
            folder: "Ecommece_avatars",
            width: 150,
            height: 150,
            crop: "scale",
        });

        avatarData = {
            public_id: newProfileImage.public_id,
            url: newProfileImage.secure_url,
        };
    }

    let user;
    if (Object.keys(avatarData).length === 0) {
        user = await database.query("UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *", [name, email, req.user.id]);
    } else {
        user = await database.query("UPDATE users SET name = $1, email = $2, avatar = $3 WHERE id = $4 RETURNING *", [name, email, avatarData, req.user.id]);
    }
    res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: user.rows[0],
    });


});