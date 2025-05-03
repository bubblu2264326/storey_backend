const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

// Log environment variables (excluding sensitive data)
console.log('Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

// Create a new pool with detailed configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Add connection timeout
    connectionTimeoutMillis: 5000,
    // Add idle timeout
    idleTimeoutMillis: 30000,
    // Add max clients
    max: 20
});

// Test the connection with detailed error handling
pool.connect((err, client, release) => {
    if (err) {
        console.error('\n=== Database Connection Error ===');
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        
        // Provide specific troubleshooting steps based on error
        if (err.code === 'ECONNREFUSED') {
            console.error('\nTroubleshooting steps:');
            console.error('1. Check if PostgreSQL is running');
            console.error('2. Verify the database URL in .env file');
            console.error('3. Check if the port is correct (default: 5432)');
            console.error('4. Ensure the database exists');
            console.error('5. Verify username and password');
        } else if (err.code === '28P01') {
            console.error('\nTroubleshooting steps:');
            console.error('1. Check if the password is correct');
            console.error('2. Verify the username exists');
        } else if (err.code === '3D000') {
            console.error('\nTroubleshooting steps:');
            console.error('1. Check if the database exists');
            console.error('2. Create the database if it doesn\'t exist');
        }
        
        process.exit(1);
    }
    
    console.log('\n=== Database Connection Successful ===');
    console.log('Connected to:', process.env.DATABASE_URL);
    console.log('Client info:', {
        host: client.host,
        port: client.port,
        database: client.database,
        user: client.user
    });
    release();
});

// Handle pool errors
pool.on('error', (err) => {
    console.error('\n=== Pool Error ===');
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    process.exit(-1);
});

// Handle pool events
pool.on('connect', () => {
    console.log('New client connected to the pool');
});

pool.on('acquire', () => {
    console.log('Client checked out from the pool');
});

pool.on('remove', () => {
    console.log('Client removed from the pool');
});

// Export the pool and query function with logging
module.exports = {
    query: (text, params) => {
        console.log('\n=== Query Execution ===');
        console.log('Query:', text);
        console.log('Parameters:', params);
        return pool.query(text, params)
            .catch(err => {
                console.error('\n=== Query Error ===');
                console.error('Query:', text);
                console.error('Parameters:', params);
                console.error('Error:', err);
                throw err;
            });
    },
    pool
}; 