"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const migrator_1 = require("drizzle-orm/node-postgres/migrator");
const index_js_1 = require("./index.js");
async function runMigrations() {
    console.log("Running database migrations...");
    try {
        await (0, migrator_1.migrate)(index_js_1.db, { migrationsFolder: "./drizzle" });
        console.log("Migrations completed successfully");
    }
    catch (error) {
        console.error("Migration failed:", error);
        throw error;
    }
    finally {
        await index_js_1.pool.end();
    }
}
runMigrations();
