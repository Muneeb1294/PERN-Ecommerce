import express from "express";
import {
    register,
    login,
    getUser,
    forgotPassword,
    resetPassword,
    updatePassword,
    updateProfile,
} from "../controllers/authController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "Muneeb" }
 *               email: { type: string, example: "muneeb@example.com" }
 *               password: { type: string, example: "secret123" }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 */
router.post("/register", register);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "muhammadmuneeb94@gmail.com" }
 *               password: { type: string, example: "12345@aA" }
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       400:
 *         description: Bad request
 */
router.post("/login", login);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     summary: Get user details
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 user: { type: object, example: { id: 1, name: "Muneeb", email: "muneeb@example.com" } }
 *       401:
 *         description: Unauthorized
 */
router.get("/me", isAuthenticated, getUser);

/**
 * @openapi
 * /api/v1/auth/password/forgot:
 *   post:
 *     summary: Forgot password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: "muhammadmuneeb94@gmail.com" }
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Bad request
 */
router.post("/password/forgot", forgotPassword);

/**
 * @openapi
 * /api/v1/auth/password/reset:
 *   put:
 *     summary: Reset password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password, confirmPassword, token]
 *             properties:
 *               password: { type: string, example: "12345@aA" }
 *               confirmPassword: { type: string, example: "12345@aA" }
 *               token: { type: string, example: "1234567890" }
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Bad request
 */
router.put("/password/reset", resetPassword);

/**
 * @openapi
 * /api/v1/auth/password/update:
 *   put:
 *     summary: Update password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmNewPassword]
 *             properties:
 *               currentPassword: { type: string, example: "12345@aA" }
 *               newPassword: { type: string, example: "12345@aA" }
 *               confirmNewPassword: { type: string, example: "12345@aA" }
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Bad request
 */
router.put("/password/update", isAuthenticated, updatePassword);

/**
 * @openapi
 * /api/v1/auth/profile/update:
 *   put:
 *     summary: Update profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, email, avatar]
 *             properties:
 *               name: { type: string, example: "Muneeb" }
 *               email: { type: string, example: "muneeb@example.com" }
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put("/profile/update", isAuthenticated, updateProfile);
export default router;
