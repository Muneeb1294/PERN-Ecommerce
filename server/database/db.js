import pkg from 'pg';
import { config } from 'dotenv';

const { Client } = pkg;

config({ path: './config/config.env' });

const database = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

try {
    await database.connect();
    console.log('Connected to the database');
} catch (error) {
    console.error('Error connecting to the database', error);
    process.exit(1);
}

export default database;