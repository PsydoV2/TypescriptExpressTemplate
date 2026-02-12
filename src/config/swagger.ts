import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const HTTPPORT: number = parseInt(process.env.HTTPPORT || "9080", 10) ;

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Express TypeScript API",
            version: "1.0.0",
            description: "A professional documentation for my backend template",
        },
        servers: [
            {
                url: `http://localhost:${HTTPPORT}`,
                description: "Development server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                LoginInput: {
                    type: "object",
                    required: ["emailOrUsername", "password"],
                    properties: {
                        emailOrUsername: { type: "string", example: "DummyName or email@dummy.com" },
                        password: { type: "string", example: "Password12451" }
                    }
                },
                RegisterInput: {
                    type: "object",
                    required: ["username", "email", "password"],
                    properties: {
                        username: { type: "string", example: "DummyName" },
                        email: { type: "string", example: "email@dummy.com" },
                        password: { type: "string", example: "Password12451" }
                    }
                },
                GetUserInput: {
                    type: "object",
                    required: ["userID"],
                    properties: {
                        userID: { type: "string", format: "uuid", example: "1c1645cc-0789-11f1-96b2-02016e4234e7" }
                    }
                },
                DeleteUserInput: {
                    type: "object",
                    required: ["userID", "reason"],
                    properties: {
                        userID: { type: "string", format: "uuid", example: "1c1645cc-0789-11f1-96b2-02016e4234e7" },
                        reason: { type: "string", example: "I no longer need this account", minLength: 10 }
                    }
                }
            }
        },
    },

    apis: [
        process.env.NODE_ENV === "localhost"
            ? "./src/routes/*.ts"
            : "./dist/routes/*.js"
    ],
};

const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app: Express) {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log(`📖 Swagger docs running on port ${HTTPPORT} and route /api-docs`);
}