import express from "express";
import { getAllUsers, deleteUser, dashboardStats } from "../controllers/adminController.js";
import { authorizedRoles, isAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();


/**
 * @openapi
 * /api/v1/admin/getallusers:
 *   get:
 *     summary: List all customer accounts (admin only)
 *     description: |
 *       Returns users whose `role` is **user** (excludes admins), newest first, paginated at **10** per page.
 *       Requires a valid Bearer JWT for a user whose `role` is **admin** (case-sensitive, must equal `admin`).
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         description: Page number (1-based). Omitted or invalid values default to page 1.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *           example: 1
 *     responses:
 *       200:
 *         description: OK — paginated list of users with role `user`
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, totalUsers, currentPage, users]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 totalUsers:
 *                   type: integer
 *                   description: Total count of users with role `user` (all pages)
 *                   example: 42
 *                 currentPage:
 *                   type: integer
 *                   description: Active page number from the request (defaults to 1)
 *                   example: 1
 *                 users:
 *                   type: array
 *                   description: Up to 10 user rows for this page (shape matches `users` table)
 *                   items:
 *                     type: object
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Authenticated user is not an admin
 *       500:
 *         description: Internal server error
 */
router.get("/getallusers", isAuthenticated, authorizedRoles("admin"), getAllUsers);

/**
 * @openapi
 * /api/v1/admin/deleteuser/{id}:
 *   delete:
 *     summary: Delete a user (admin only)
 *     description: |
 *       **Admin only** (`role` must equal `admin`). Removes the user with the given UUID and, if the user
 *       has a Cloudinary avatar (`avatar.public_id`), deletes that asset from Cloudinary as well.
 *       In Swagger "Try it out", set **id** to a real UUID from `GET /api/v1/admin/getallusers` → `users[].id`
 *       (not the literal `:id` or `{id}` placeholder).
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Target user UUID
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "4840f5c9-cb4f-467f-a9f2-fb68a54da005"
 *     responses:
 *       200:
 *         description: User deleted; deleted row is returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, message, user]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User deleted successfully"
 *                 user:
 *                   type: object
 *                   description: The deleted user row (shape matches `users` table)
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Authenticated user is not an admin
 *       404:
 *         description: No user found with this id
 *       500:
 *         description: Internal server error (e.g. DB or Cloudinary failure)
 */
router.delete("/deleteuser/:id", isAuthenticated, authorizedRoles("admin"), deleteUser);

/**
 * @openapi
 * /api/v1/admin/fetch/dashboard-stats:
 *   get:
 *     summary: Fetch admin dashboard statistics (admin only)
 *     description: |
 *       **Admin only** (`role` must equal `admin`). Aggregates revenue, user, and order metrics for the admin dashboard:
 *       - All-time, today's, and yesterday's revenue
 *       - Count of customer accounts (`role = 'user'`) and new users this month
 *       - Order status breakdown (`Processing`, `Shipped`, `Delivered`, `Cancelled`)
 *       - Monthly sales series for charts
 *       - Top 5 best-selling products and products with `stock <= 5`
 *       - Current month sales total and month-over-month revenue growth rate
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK — aggregated dashboard stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - totalRevenueAllTime
 *                 - todayRevenue
 *                 - yesterdayRevenue
 *                 - totalUsersCount
 *                 - orderStatusCounts
 *                 - monthlySales
 *                 - currentMonthSales
 *                 - topProducts
 *                 - lowStockProducts
 *                 - revenueGrowthRate
 *                 - newUsersThisMonth
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Dashboard stats fetched successfully"
 *                 totalRevenueAllTime:
 *                   type: number
 *                   format: float
 *                   description: Sum of `total_price` across all orders (0 when none)
 *                   example: 18450.75
 *                 todayRevenue:
 *                   type: number
 *                   format: float
 *                   description: Sum of `total_price` for orders created today (server date)
 *                   example: 320.5
 *                 yesterdayRevenue:
 *                   type: number
 *                   format: float
 *                   example: 410
 *                 totalUsersCount:
 *                   type: integer
 *                   description: Count of users with `role = 'user'`
 *                   example: 128
 *                 orderStatusCounts:
 *                   type: object
 *                   description: Order counts grouped by `order_status`; missing statuses default to 0
 *                   required: [Processing, Shipped, Delivered, Cancelled]
 *                   properties:
 *                     Processing: { type: integer, example: 4 }
 *                     Shipped:    { type: integer, example: 9 }
 *                     Delivered:  { type: integer, example: 57 }
 *                     Cancelled:  { type: integer, example: 2 }
 *                 monthlySales:
 *                   type: array
 *                   description: Monthly sales series, ascending by month
 *                   items:
 *                     type: object
 *                     required: [month, total_sales]
 *                     properties:
 *                       month:
 *                         type: string
 *                         description: "Month label, e.g. `May 2026`"
 *                         example: "May 2026"
 *                       total_sales:
 *                         type: number
 *                         format: float
 *                         example: 4520.25
 *                 currentMonthSales:
 *                   type: number
 *                   format: float
 *                   description: Sum of `total_price` for orders in the current calendar month
 *                   example: 4520.25
 *                 topProducts:
 *                   type: array
 *                   description: Top 5 products by total quantity sold (joined via `order_items`)
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:       { type: string, example: "REDMI NOTE 14" }
 *                       image:      { type: string, description: "First image URL from `products.images[0].url`", example: "https://res.cloudinary.com/demo/image/upload/v1/product.jpg" }
 *                       category:   { type: string, example: "Electronics" }
 *                       ratings:    { type: number, format: float, example: 4.5 }
 *                       total_sold: { type: integer, example: 42 }
 *                 lowStockProducts:
 *                   type: array
 *                   description: Products where `stock <= 5`
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:  { type: string, example: "REDMI NOTE 14" }
 *                       stock: { type: integer, example: 3 }
 *                 revenueGrowthRate:
 *                   type: string
 *                   description: |
 *                     Current vs previous month revenue as a percentage string, 2 decimal places.
 *                     Returns `"0%"` when there was no revenue last month.
 *                   example: "12.50%"
 *                 newUsersThisMonth:
 *                   type: integer
 *                   description: Users created since the first day of the current month
 *                   example: 7
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Authenticated user is not an admin
 *       500:
 *         description: Internal server error
 */
router.get("/fetch/dashboard-stats", isAuthenticated, authorizedRoles("admin"), dashboardStats);

export default router;