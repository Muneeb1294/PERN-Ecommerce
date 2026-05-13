import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fileUpload from 'express-fileupload';
import { createTables } from './utils/createTables.js';
import { errorMiddleware } from './middlewares/errorMiddleware.js';
import authRoutes from './router/authRoutes.js';
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import productRoutes from './router/productRoutes.js';
import adminRoutes from './router/adminRoutes.js';
import stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config({ path: './config/config.env' });
import database from './database/db.js';
import orderRoutes from './router/orderRoutes.js';

const app = express();

app.use(cors({
    // origin: [process.env.FRONTEND_URL, process.env.DASHBOARD_URL],
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.post('/api/v1/payment/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handling the Event

    if (event.type === 'payment_intent.succeeded') {
        const payment_intent_client_secret = event.data.object.client_secret;
        try {
            // Find and update payment
            const updatedPaymentStatus = "Paid";
            const paymentTableUpdateResult = await database.query('UPDATE payments SET payment_status = $1 WHERE payment_intent_id = $2 RETURNING *', [updatedPaymentStatus, payment_intent_client_secret]);
            await database.query('UPDATE orders SET paid_at = NOW() WHERE id = $1', [paymentTableUpdateResult.rows[0].order_id]);

            // Reduce Stock of Products
            const orderId = paymentTableUpdateResult.rows[0].order_id;
            const { rows: orderedItems } = await database.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [orderId]);

            // For each ordered item, reduce the product stock
            for (const item of orderedItems) {
                await database.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
            }
        } catch (err) {
            return res.status(500).send(`Error updating paid_at timestamp in order table.`);
        }

        res.status(200).send({ received: true });

    }

});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(fileUpload(
    {
        useTempFiles: true,
        tempFileDir: './uploads',
        limits: {
            fileSize: 50 * 1024 * 1024, // 50MB
        },
    }
));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/orders", orderRoutes);

// await createTables();

app.use(errorMiddleware);

export default app;