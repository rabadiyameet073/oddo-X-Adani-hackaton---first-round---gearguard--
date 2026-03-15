const { Pool } = require('pg');
require('dotenv').config();

// Vercel Postgres (and others) use DATABASE_URL; otherwise use individual vars
const poolConfig = process.env.DATABASE_URL
    ? {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
      }
    : {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'gearguard',
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
      };

const pool = new Pool(poolConfig);

// Test connection
pool.connect()
    .then(client => {
        console.log('PostgreSQL Database connected successfully');
        client.release();
    })
    .catch(err => {
        console.error('Database connection failed:', err.message);
    });

module.exports = pool;
