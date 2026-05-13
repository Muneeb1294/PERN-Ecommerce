import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import database from "../database/db.js";
import { v2 as cloudinary } from "cloudinary";
import { getAIRecommendation } from "../utils/getAIRecommendation.js";

export const createProduct = catchAsyncError(async (req, res, next) => {
    const { name, description, price, category, stock } = req.body;
    const created_by = req.user.id;

    if (!name || !description || !price || !category || !stock) {
        return next(new ErrorHandler("Please enter all required fields", 400));
    }

    let uploadedImages = [];
    if (req.files && req.files.images) {
        const images = Array.isArray(req.files.images)
            ? req.files.images
            : [req.files.images];
        for (const image of images) {
            const uploadedImage = await cloudinary.uploader.upload(
                image.tempFilePath,
                {
                    folder: "Ecommerce_Product_Images",
                    width: 1000,
                    height: 1000,
                    crop: "scale",
                },
            );
            uploadedImages.push({
                public_id: uploadedImage.public_id,
                url: uploadedImage.secure_url,
            });
        }
    }

    const product = await database.query(
        "INSERT INTO products (name, description, price, category, stock, created_by, images) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [
            name,
            description,
            price,
            category,
            stock,
            created_by,
            JSON.stringify(uploadedImages),
        ],
    );

    res.status(201).json({
        success: true,
        message: "Product created successfully",
        product: product.rows[0],
    });
});

export const fetchAllProducts = catchAsyncError(async (req, res, next) => {
    const { availability, price, category, ratings, search } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const condition = [];
    let values = [];
    let index = 1;

    let paginationPlaceHolders = {};

    // Availability Filter
    if (availability === "in-stock") {
        condition.push(`stock > 5`);
    } else if (availability === "limited") {
        condition.push("stock > 0 AND stock <= 5");
    } else if (availability === "out-of-stock") {
        condition.push("stock = 0");
    }

    // Price Filter
    if (price) {
        const [minPrice, maxPrice] = price.split("-");
        condition.push(`price BETWEEN $${index} AND $${index + 1}`);
        values.push(minPrice, maxPrice);
        index += 2;
    }

    // Category Filter
    if (category) {
        condition.push(`category ILIKE $${index}`);
        values.push(`%${category}%`);
        index++;
    }

    // Ratings Filter
    if (ratings) {
        condition.push(`ratings >= $${index}`);
        values.push(ratings);
        index++;
    }

    // Search Filter
    if (search) {
        condition.push(`p.name ILIKE $${index} OR p.description ILIKE $${index}`);
        values.push(`%${search}%`);
        index++;
    }

    const whereClause =
        condition.length > 0 ? `WHERE ${condition.join(" AND ")}` : "";

    // Get Total Count
    const totalProductsResult = await database.query(
        `SELECT COUNT(*) FROM products p ${whereClause}`,
        values,
    );

    const totalProducts = parseInt(totalProductsResult.rows[0].count);

    paginationPlaceHolders.limit = `$${index}`;
    values.push(limit);
    index++;

    paginationPlaceHolders.offset = `$${index}`;
    values.push(offset);
    index++;

    // Fetch With Reviews
    const reviewQuery = `
    SELECT p.*, COUNT(r.id) AS review_count
    FROM products p
    LEFT JOIN reviews r
    ON p.id = r.product_id ${whereClause} 
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT ${paginationPlaceHolders.limit} 
    OFFSET ${paginationPlaceHolders.offset}`;

    const result = await database.query(reviewQuery, values);

    // Fetch New Products
    const newProductsQuery = `
    SELECT p.*,
    COUNT(r.id) AS review_count
    FROM products p
    LEFT JOIN reviews r
    ON p.id = r.product_id
    WHERE p.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT 8`;

    const newProductsResult = await database.query(newProductsQuery);

    // Fetch Top Rated Products
    const topRatedQuery = `
    SELECT p.*,
    COUNT(r.id) AS review_count
    FROM products p
    LEFT JOIN reviews r
    ON p.id = r.product_id
    WHERE p.ratings >= 4
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT 8`;

    const topRatedResult = await database.query(topRatedQuery);

    res.status(200).json({
        success: true,
        message: "Products fetched successfully",
        products: result.rows,
        totalProducts,
        newProducts: newProductsResult.rows,
        topRated: topRatedResult.rows,
    });
});

export const updateProduct = catchAsyncError(async (req, res, next) => {
    const { productId } = req.params;
    const { name, description, price, category, stock } = req.body;

    if (!name || !description || !price || !category || !stock) {
        return next(new ErrorHandler("Please enter all required fields", 400));
    }

    const product = await database.query(`SELECT * FROM products WHERE id = $1`, [
        productId,
    ]);
    if (!product.rows.length) {
        return next(new ErrorHandler("Product not found", 404));
    }

    const updatedProduct = await database.query(
        `UPDATE products SET name = $1, description = $2, price = $3, category = $4, stock = $5 WHERE id = $6 RETURNING *`,
        [name, description, price, category, stock, productId],
    );
    res.status(200).json({
        success: true,
        message: "Product updated successfully",
        updatedProduct: updatedProduct.rows[0],
    });
});

export const deleteProduct = catchAsyncError(async (req, res, next) => {

    const { productId } = req.params;

    const product = await database.query(`SELECT * FROM products WHERE id = $1`, [productId]);
    if (!product.rows.length) {
        return next(new ErrorHandler("Product not found", 404));
    }
    const images = product.rows[0].images;

    const deleteResult = await database.query(`DELETE FROM products WHERE id = $1 RETURNING *`, [productId]);

    if (deleteResult.rows.length === 0) {
        return next(new ErrorHandler("Product not found", 404));
    }

    if (images && images.length > 0) {
        for (const image of images) {
            await cloudinary.uploader.destroy(image.public_id);
        }
    }

    res.status(200).json({
        success: true,
        message: "Product deleted successfully",
    });
});

export const fetchSingleProduct = catchAsyncError(async (req, res, next) => {
    const { productId } = req.params;
    const product = await database.query(`
        SELECT p.*,
        COALESCE(
        json_agg(
        json_build_object(
        'review_id', r.id,
        'rating', r.rating,
        'comment', r.comment,
        'reviewer', json_build_object(
        'id', u.id, 
        'name', u.name, 
        'avatar', u.avatar)
        )) FILTER (WHERE r.id IS NOT NULL),
        '[]') AS reviews
        FROM products p LEFT JOIN reviews r ON p.id = r.product_id
        LEFT JOIN users u ON r.user_id = u.id
        WHERE p.id = $1
        GROUP BY p.id`, [productId]);
    if (!product.rows.length) {
        return next(new ErrorHandler("Product not found", 404));
    }
    res.status(200).json({
        success: true,
        message: "Product fetched successfully",
        product: product.rows[0],
    });
});

export const postProductReview = catchAsyncError(async (req, res, next) => {
    const { productId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || !comment) {
        return next(new ErrorHandler("Please enter all required fields", 400));
    }

    const productInfo = await database.query(`SELECT * FROM products WHERE id = $1`, [productId]);
    if (!productInfo.rows.length) {
        return next(new ErrorHandler("Product not found", 404));
    }

    const purchasedCheckQuery = "SELECT oi.product_id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN payments p ON p.order_id = o.id WHERE o.buyer_id = $1 AND oi.product_id = $2 AND p.payment_status = 'Paid' LIMIT 1";

    const { rows } = await database.query(purchasedCheckQuery, [req.user.id, productId]);
    if (!rows.length) {
        return next(new ErrorHandler("You must purchase this product to review it", 400));
    }

    const reviewCheckQuery = "SELECT * FROM reviews WHERE product_id = $1 AND user_id = $2";
    const { rows: reviewRows } = await database.query(reviewCheckQuery, [productId, req.user.id]);
    if (reviewRows.length === 0) {
        return res.status(403).json({
            success: false,
            message: "You can only review a product you've purchased",
        });
    }

    const product = await database.query(`SELECT * FROM products WHERE id = $1`, [productId]);
    if (!product.rows.length) {
        return next(new ErrorHandler("Product not found", 404));
    }

    const isAlreadyReviewed = await database.query(`SELECT * FROM reviews WHERE product_id = $1 AND user_id = $2`, [productId, req.user.id]);
    if (isAlreadyReviewed.rows.length > 0) {
        return res.status(403).json({
            success: false,
            message: "You have already reviewed this product",
        });
    }

    const review = await database.query(`INSERT INTO reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *`, [productId, req.user.id, rating, comment]);

    const allReviews = await database.query(`SELECT AVG(rating) AS average_rating FROM reviews WHERE product_id = $1`, [productId]);

    const newAvgRating = allReviews.rows[0].average_rating;
    const updateProductQuery = `UPDATE products SET ratings = $1 WHERE id = $2 RETURNING *`;
    const updatedProduct = await database.query(updateProductQuery, [newAvgRating, productId]);

    res.status(201).json({
        success: true,
        message: "Review posted successfully",
        review: review.rows[0],
        product: updatedProduct.rows[0],
    });
});

export const deleteReview = catchAsyncError(async (req, res, next) => {
    const { productId } = req.params;

    const review = await database.query(`SELECT * FROM reviews WHERE product_id = $1 AND user_id = $2 RETURNING *`, [productId, req.user.id]);
    if (!review.rows.length) {
        return next(new ErrorHandler("Review not found", 404));
    }

    const allReviews = await database.query(`SELECT AVG(rating) AS average_rating FROM reviews WHERE product_id = $1`, [productId]);
    const newAvgRating = allReviews.rows[0].average_rating;
    const updateProductQuery = `UPDATE products SET ratings = $1 WHERE id = $2 RETURNING *`;
    const updatedProduct = await database.query(updateProductQuery, [newAvgRating, productId]);



    res.status(200).json({
        success: true,
        message: "Review deleted successfully",
        review: review.rows[0],
        product: updatedProduct.rows[0],
    });
});

export const fetchAIFilteredProducts = catchAsyncError(async (req, res, next) => {
    const userPrompt = req.body?.query ?? req.body?.userPrompt;

    if (!userPrompt || typeof userPrompt !== "string" || !userPrompt.trim()) {
        return next(new ErrorHandler("Please enter a search query", 400));
    }

    const filterKeywords = (query) => {
        const stopWords = new Set([
            "the",
            "they",
            "them",
            "then",
            "I",
            "we",
            "you",
            "he",
            "she",
            "it",
            "is",
            "a",
            "an",
            "of",
            "and",
            "or",
            "to",
            "for",
            "from",
            "on",
            "who",
            "whom",
            "why",
            "when",
            "which",
            "with",
            "this",
            "that",
            "in",
            "at",
            "by",
            "be",
            "not",
            "was",
            "were",
            "has",
            "have",
            "had",
            "do",
            "does",
            "did",
            "so",
            "some",
            "any",
            "how",
            "can",
            "could",
            "should",
            "would",
            "there",
            "here",
            "just",
            "than",
            "because",
            "but",
            "its",
            "it's",
            "if",
            ".",
            ",",
            "!",
            "?",
            ">",
            "<",
            ";",
            "`",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
        ]);

        return query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(word => !stopWords.has(word)).map(word => `%${word}%`);

    };

    const keywords = filterKeywords(userPrompt);

    // STEP 1: Basic SQL Filtering
    const result = await database.query('SELECT * FROM products WHERE name ILIKE ANY($1) OR description ILIKE ANY($1) OR category ILIKE ANY($1) LIMIT 200', [keywords]);

    const filteredProducts = result.rows;

    if (filteredProducts.length === 0) {
        return res.status(200).json({
            success: true,
            message: "No products found matching your search query",
            products: [],
        });
    }

    // STEP 2: AI Filtering
    const { success, products } = await getAIRecommendation(req, res, userPrompt, filteredProducts);

    res.status(200).json({
        success: success,
        message: "AI filtered products fetched successfully",
        products: products,
    });




});