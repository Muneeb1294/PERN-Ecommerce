class ErrorHandler extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

export const errorMiddleware = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";
    if (err.code === 11000) {
        const message = `Duplicate field value: ${Object.keys(err.keyValue)} entered`;
        err = new ErrorHandler(message, 400);
    }
    if (err.name === "JsonWebTokenError") {
        const message = `Json Web Token is invalid, try again`;
        err = new ErrorHandler(message, 400);
    }
    if (err.name === "TokenExpiredError") {
        const message = `Json Web Token is expired, try again`;
        err = new ErrorHandler(message, 400);
    }

    const errorMessage = err.errors
        ? Object.values(err.errors)
            .map((error) => error.message)
            .join(", ")
        : err.message;

    console.log(err);

    return res.status(err.statusCode).json({
        success: false,
        message: errorMessage,
    });
};

export default ErrorHandler;
