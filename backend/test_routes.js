const fs = require('fs');

let output = '';
function log(msg) {
    output += msg + '\n';
    console.log(msg);
}

const routes = [
    'auth', 'user', 'company', 'shipment', 'vehicle', 'driver',
    'route', 'tracking', 'payment', 'invoice', 'notification',
    'analytics', 'document', 'pricing', 'admin', 'webhook'
];

for (const route of routes) {
    try {
        log(`Loading ${route}.routes.js...`);
        require(`./src/routes/${route}.routes`);
        log(`SUCCESS: ${route}.routes.js`);
    } catch (error) {
        log(`FAILED: ${route}.routes.js`);
        log(`Error: ${error.message}`);
        log(`Stack:\n${error.stack}`);
        break;
    }
}

fs.writeFileSync('route_test_output.txt', output);
log('Output written to route_test_output.txt');
