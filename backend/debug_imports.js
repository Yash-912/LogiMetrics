const userController = require('./src/controllers/user.controller');
const rbacMiddleware = require('./src/middleware/rbac.middleware');
const validators = require('./src/validators');
const validationMiddleware = require('./src/middleware/validation.middleware'); // Assuming default export or named

try {
    console.log('--- DEBUG START ---');
    console.log('userController.getUsers type:', typeof userController.getUsers);
    console.log('rbacMiddleware.authorize type:', typeof rbacMiddleware.authorize);

    if (validators.userValidator) {
        console.log('validators.userValidator.listUsersValidation type:', typeof validators.userValidator.listUsersValidation);
        console.log('validators.userValidator.listUsersValidation is array:', Array.isArray(validators.userValidator.listUsersValidation));
    } else {
        console.log('validators.userValidator is UNDEFINED');
    }

    console.log('validationMiddleware.validate type:', typeof validationMiddleware.validate);
    console.log('--- DEBUG END ---');
} catch (error) {
    console.error('Debug script error:', error);
}
