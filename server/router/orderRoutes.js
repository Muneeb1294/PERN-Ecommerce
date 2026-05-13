import express from "express";
import {
    fetchSingleOrder,
    placeNewOrder,
    fetchMyOrders,
    fetchAllOrders,
    updateOrderStatus,
    deleteOrder,
} from "../controllers/orderController.js";
import {
    isAuthenticated,
    authorizedRoles,
} from "../middlewares/authMiddleware.js";


const router = express.Router();


/**
 * @swagger
 * /api/v1/orders/new:
 *   post:
 *     summary: Place a new order
 *     description: Places a new order for the authenticated user.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - state
 *               - city
 *               - country
 *               - address
 *               - pincode
 *               - phone
 *               - orderedItems
 *             properties:
 *               full_name:
 *                 type: string
 *               state:
 *                 type: string
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *               address:
 *                 type: string
 *               pincode:
 *                 type: string
 *               phone:
 *                 type: string
 *               orderedItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         images:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               url:
 *                                 type: string
 *                     quantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Order placed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 paymentIntent:
 *                   type: string
 *                 total_price:
 *                   type: integer
 *       400:
 *         description: Invalid request or missing information
 *       500:
 *         description: Order or payment processing failed
 */
router.post("/new", isAuthenticated, placeNewOrder);

/**
 * @swagger
 * /api/v1/orders/{orderId}:
 *   get:
 *     summary: Fetch a single order by orderId
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order to retrieve
 *     responses:
 *       200:
 *         description: Successfully fetched order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 order:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     buyer_id:
 *                       type: string
 *                     total_price:
 *                       type: integer
 *                     tax_price:
 *                       type: number
 *                     shipping_price:
 *                       type: number
 *                     paid_at:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                     order_items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           order_item_id:
 *                             type: string
 *                           order_id:
 *                             type: string
 *                           product_id:
 *                             type: string
 *                           quantity:
 *                             type: integer
 *                           price:
 *                             type: integer
 *                     shipping_info:
 *                       type: object
 *                       properties:
 *                         full_name:
 *                           type: string
 *                         state:
 *                           type: string
 *                         city:
 *                           type: string
 *                         country:
 *                           type: string
 *                         address:
 *                           type: string
 *                         pincode:
 *                           type: string
 *                         phone:
 *                           type: string
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Order not found
 */
router.get("/:orderId", isAuthenticated, fetchSingleOrder);

/**
 * @swagger
 * /api/v1/orders/orders/me:
 *   get:
 *     summary: Get current user's orders
 *     description: Retrieves all orders placed by the authenticated user.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: Orders fetched successfully
 *                 myOrders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       buyer_id:
 *                         type: string
 *                       total_price:
 *                         type: integer
 *                       tax_price:
 *                         type: number
 *                       shipping_price:
 *                         type: number
 *                       paid_at:
 *                         type: string
 *                         nullable: true
 *                       created_at:
 *                         type: string
 *                       order_items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             order_item_id:
 *                               type: string
 *                             order_id:
 *                               type: string
 *                             product_id:
 *                               type: string
 *                             quantity:
 *                               type: integer
 *                             price:
 *                               type: integer
 *                             image:
 *                               type: string
 *                             title:
 *                               type: string
 *                       shipping_info:
 *                         type: object
 *                         properties:
 *                           full_name:
 *                             type: string
 *                           state:
 *                             type: string
 *                           city:
 *                             type: string
 *                           country:
 *                             type: string
 *                           address:
 *                             type: string
 *                           pincode:
 *                             type: string
 *                           phone:
 *                             type: string
 *       401:
 *         description: Unauthorized, authentication required
 */
router.get("/orders/me", isAuthenticated, fetchMyOrders);

/**
 * @swagger
 * /api/v1/orders/admin/getall:
 *   get:
 *     summary: Get all orders (Admin only)
 *     description: Retrieve a list of all orders. Accessible only by users with Admin role.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all orders.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Orders fetched successfully
 *                 allOrders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       buyer_id:
 *                         type: string
 *                         format: uuid
 *                       total_price:
 *                         type: integer
 *                       tax_price:
 *                         type: number
 *                       shipping_price:
 *                         type: number
 *                       paid_at:
 *                         type: string
 *                         nullable: true
 *                       created_at:
 *                         type: string
 *                       order_items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             order_item_id:
 *                               type: string
 *                             order_id:
 *                               type: string
 *                             product_id:
 *                               type: string
 *                             quantity:
 *                               type: integer
 *                             price:
 *                               type: integer
 *                             image:
 *                               type: string
 *                             title:
 *                               type: string
 *                       shipping_info:
 *                         type: object
 *                         properties:
 *                           full_name:
 *                             type: string
 *                           state:
 *                             type: string
 *                           city:
 *                             type: string
 *                           country:
 *                             type: string
 *                           address:
 *                             type: string
 *                           pincode:
 *                             type: string
 *                           phone:
 *                             type: string
 *       401:
 *         description: Unauthorized, authentication required.
 *       403:
 *         description: Forbidden, requires admin access.
 */
router.get(
    "/admin/getall",
    isAuthenticated,
    authorizedRoles("admin"),
    fetchAllOrders
);

/**
 * @swagger
 * /api/v1/orders/admin/update/{orderId}:
 *   put:
 *     summary: Update the status of an order (Admin only)
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 example: shipped
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 updatedOrder:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     order_status:
 *                       type: string
 *       400:
 *         description: Missing or invalid status value
 *       401:
 *         description: Unauthorized, authentication required
 *       403:
 *         description: Forbidden, admin access required
 *       404:
 *         description: Order not found
 */
router.put(
    "/admin/update/:orderId",
    isAuthenticated,
    authorizedRoles("admin"),
    updateOrderStatus
);

/**
 * @swagger
 * /api/v1/orders/admin/delete/{orderId}:
 *   delete:
 *     summary: Delete an order (Admin only)
 *     description: Allows an admin to delete an order by its ID.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order to delete
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized, authentication required
 *       403:
 *         description: Forbidden, admin access required
 *       404:
 *         description: Order not found
 */
router.delete(
    "/admin/delete/:orderId",
    isAuthenticated,
    authorizedRoles("admin"),
    deleteOrder
);

export default router;
