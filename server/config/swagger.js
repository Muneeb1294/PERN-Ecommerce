import swaggerJSDoc from "swagger-jsdoc";

const options = {
    failOnErrors: true,
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Ecommerce API",
            version: "1.0.0",
            description: "API documentation for ecommerce backend",
        },
        servers: [
            { url: "http://localhost:4000", description: "Local dev server" },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
    },
    apis: ["./router/*.js", "./controllers/*.js"], // files with @openapi comments
};

export const swaggerSpec = swaggerJSDoc(options);