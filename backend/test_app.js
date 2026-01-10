// Test loading the full app
console.log('Loading dotenv...');
require('dotenv').config();

console.log('Loading app.js...');
try {
    const app = require('./src/app');
    console.log('SUCCESS: app.js loaded');
    console.log('App is ready for server.listen()');
} catch (error) {
    console.error('FAILED to load app.js:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
}
