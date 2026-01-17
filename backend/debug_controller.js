try {
    console.log('Loading user controller...');
    const userController = require('./src/controllers/user.controller');
    console.log('User Controller loaded.');
    console.log('User Controller Exports:', Object.keys(userController));

    console.log('Loading company controller...');
    const companyController = require('./src/controllers/company.controller');
    console.log('Company Controller loaded.');
    console.log('Company Controller Exports:', Object.keys(companyController));

    console.log('Loading company routes...');
    const companyRoutes = require('./src/routes/company.routes');
    console.log('Company Routes loaded.');

} catch (e) {
    console.error('FAILURE:', e);
}
