import express from "express";
import {
    createProduct,
    fetchAllProducts,
    updateProduct,
    deleteProduct,
    fetchSingleProduct,
    postProductReview,
    deleteReview,
    fetchAIFilteredProducts,
} from "../controllers/productController.js";
import {
    authorizedRoles,
    isAuthenticated,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/v1/products/admin/create:
 *   post:
 *     summary: Create a new product (admin only)
 *     description: |
 *       Requires a Bearer JWT for a user whose `role` is **admin** (case-sensitive).
 *       Send `multipart/form-data`. You may attach one or more files under the field name **images** (same name repeated, or an array in clients that support it).
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, description, price, category, stock, images]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Product display name
 *                 example: "REDMI NOTE 14"
 *               description:
 *                 type: string
 *                 description: Full product description
 *                 example: "6.67 inch AMOLED display, 50MP camera"
 *               price:
 *                 type: number
 *                 format: float
 *                 description: Price (must be >= 0 per DB constraint)
 *                 example: 299.99
 *               category:
 *                 type: string
 *                 description: Category label (stored as plain text)
 *                 example: "Electronics"
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *                 description: Units in stock
 *                 example: 25
 *               images:
 *                 type: array
 *                 description: One or more image files (uploaded to Cloudinary; stored as JSON on the product)
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Product created successfully" }
 *                 product: { type: object, description: "Inserted row including id, images JSON, etc." }
 *       400:
 *         description: Missing or invalid body fields
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Authenticated but not an admin
 *       500:
 *         description: Server error (e.g. Cloudinary or DB failure)
 */
router.post(
    "/admin/create",
    isAuthenticated,
    authorizedRoles("admin"),
    createProduct,
);

/**
 * @openapi
 * /api/v1/products:
 *   get:
 *     summary: List products with filters and pagination
 *     description: |
 *       Returns three collections in one response:
 *       - **products** — paginated list (with optional filters), each row includes aggregated **review_count**
 *       - **newProducts** — up to 8 products created in the last 30 days
 *       - **topRated** — up to 8 products with `ratings >= 4`
 *       Also returns **totalProducts** count for the filtered main list (ignores pagination window for count query).
 *     tags: [Products]
 *     parameters:
 *       - name: availability
 *         in: query
 *         required: false
 *         description: Stock bucket (matches server-side rules on `stock`)
 *         schema:
 *           type: string
 *           enum: [in-stock, limited, out-of-stock]
 *           example: "in-stock"
 *       - name: price
 *         in: query
 *         required: false
 *         description: "Inclusive min-max range, hyphen-separated: `min-max` (e.g. `10-500`)"
 *         schema:
 *           type: string
 *           example: "10-500"
 *       - name: category
 *         in: query
 *         required: false
 *         description: Case-insensitive partial match (`ILIKE %value%`)
 *         schema:
 *           type: string
 *           example: "Phone"
 *       - name: ratings
 *         in: query
 *         required: false
 *         description: Minimum product `ratings` (decimal string accepted)
 *         schema:
 *           type: string
 *           example: "4"
 *       - name: search
 *         in: query
 *         required: false
 *         description: Matches against product name OR description (`ILIKE`)
 *         schema:
 *           type: string
 *           example: "redmi"
 *       - name: page
 *         in: query
 *         required: false
 *         description: Page number (1-based)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Page size for the main **products** array
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Products fetched successfully" }
 *                 products:
 *                   type: array
 *                   items: { type: object }
 *                 totalProducts: { type: integer, example: 42 }
 *                 newProducts:
 *                   type: array
 *                   items: { type: object }
 *                 topRated:
 *                   type: array
 *                   items: { type: object }
 *       400:
 *         description: Bad request (e.g. malformed query)
 *       500:
 *         description: Internal server error
 */
router.get("/", fetchAllProducts);

/**
 * @openapi
 * /api/v1/products/singleProduct/{productId}:
 *   get:
 *     summary: Get one product by id
 *     description: |
 *       Path must contain a real UUID, e.g. `/singleProduct/1fc8670c-961a-47b8-8f67-9c2725c3bd31` — not the literal `:productId` or `{productId}` placeholder text.
 *     tags: [Products]
 *     parameters:
 *       - name: productId
 *         in: path
 *         required: true
 *         description: Product UUID from GET /api/v1/products
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "1fc8670c-961a-47b8-8f67-9c2725c3bd31"
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Invalid id format
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
router.get("/singleProduct/:productId", fetchSingleProduct);

/**
 * @openapi
 * /api/v1/products/post-new/review/{productId}:
 *   put:
 *     summary: Create a review for a product
 *     description: |
 *       Intended for authenticated users; body typically holds `rating` (0–5) and `comment`.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: productId
 *         in: path
 *         required: true
 *         description: Target product UUID
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "1fc8670c-961a-47b8-8f67-9c2725c3bd31"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating, comment]
 *             properties:
 *               rating:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 5
 *                 description: Star rating (DB allows DECIMAL; must be within 0–5)
 *                 example: 4.5
 *               comment:
 *                 type: string
 *                 minLength: 1
 *                 description: Review text
 *                 example: "Great battery life."
 *     responses:
 *       200:
 *         description: Review created (when implemented)
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
router.put("/post-new/review/:productId", isAuthenticated, postProductReview);

/**
 * @openapi
 * /api/v1/products/delete/review/{productId}:
 *   delete:
 *     summary: Delete a review for a product
 *     description: |
 *       The previous spec incorrectly required `rating`/`comment` on DELETE; the real handler will define the contract (e.g. review id in path or body).
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: productId
 *         in: path
 *         required: true
 *         description: Product UUID whose review is targeted
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "1fc8670c-961a-47b8-8f67-9c2725c3bd31"
 *     responses:
 *       200:
 *         description: Review removed
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Product or review not found
 *       500:
 *         description: Internal server error
 */
router.delete("/delete/review/:productId", isAuthenticated, deleteReview);

/**
 * @openapi
 * /api/v1/products/admin/update/{productId}:
 *   put:
 *     summary: Update product fields (admin only)
 *     description: |
 *       **Admin only** (`role` must equal `admin`). Updates text/numeric fields only; does **not** replace images (see create flow for uploads).
 *       In Swagger “Try it out”, set **productId** to a real UUID from `GET /api/v1/products` → `products[].id`.
 *       The executed URL must be `/api/v1/products/admin/update/<uuid>` — not the placeholder strings `:productId` or `{productId}`.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: productId
 *         in: path
 *         required: true
 *         description: Product UUID to update
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "1fc8670c-961a-47b8-8f67-9c2725c3bd31"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description, price, category, stock]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "REDMI NOTE 14"
 *               description:
 *                 type: string
 *                 example: "Updated description"
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 319.99
 *               category:
 *                 type: string
 *                 example: "Electronics"
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *                 example: 15
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Product updated successfully" }
 *                 updatedProduct: { type: object }
 *       400:
 *         description: Missing fields or invalid types
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Authenticated user is not an admin
 *       404:
 *         description: No product with this id
 *       500:
 *         description: Internal server error
 */
router.put(
    "/admin/update/:productId",
    isAuthenticated,
    authorizedRoles("admin"),
    updateProduct,
);
/**
 * @openapi
 * /api/v1/products/admin/delete/{productId}:
 *   delete:
 *     summary: Delete a product (admin only)
 *     description: |
 *       **Admin only** (`role` must equal `admin`). Removes a product by UUID. In Swagger “Try it out”, set **productId** to a real UUID from `GET /api/v1/products` → `products[].id`. The executed URL must be `/api/v1/products/admin/delete/<uuid>` — not the placeholder strings `:productId` or `{productId}`.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: productId
 *         in: path
 *         required: true
 *         description: Product UUID to delete
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "1fc8670c-961a-47b8-8f67-9c2725c3bd31"
 *     responses:
 *       200:
 *         description: Deleted row returned (when implemented)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Product deleted successfully" }
 *                 deletedProduct: { type: object }
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Not an admin
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
router.delete(
    "/admin/delete/:productId",
    isAuthenticated,
    authorizedRoles("admin"),
    deleteProduct,
);
/**
 * @openapi
 * /api/v1/products/ai-search:
 *   post:
 *     summary: AI-assisted product search
 *     description: |
 *       Reserved for natural-language or semantic search; request shape TBD when implemented.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: Natural language search (placeholder)
 *                 example: "budget android phone under 300"
 *     responses:
 *       200:
 *         description: Filtered products
 *       400:
 *         description: Bad request
 *       401:
 *         description: Missing or invalid JWT
 *       500:
 *         description: Internal server error
 */
router.post("/ai-search", isAuthenticated, fetchAIFilteredProducts);

export default router;
