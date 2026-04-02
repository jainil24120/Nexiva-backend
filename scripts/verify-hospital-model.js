const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');

// Simple connect to avoid detailed connection errors if no mongo url provided, just need schema valid
// Actually, to test schema definition we don't even need to connect to DB, just creating a new instance
// will validate synchronous validators (like required fields if we try to validate)
// But to be safe on imports, let's just try to instantiate.

try {
    console.log('Loading Hospital model...');
    const hospital = new Hospital({
        name: 'Test Hospital',
        email: 'test@hospital.com',
        password: 'password123',
        address: '123 Health St',
        phone: '1234567890',
        location: {
            state: 'State',
            city: 'City',
            pincode: '123456'
        },
        iradaiNumber: 'IRDAI123'
    });

    console.log('Hospital model loaded and instance created successfully.');
    console.log('Role:', hospital.role); // Should be 'hospital'

    // Validate synchronously
    const error = hospital.validateSync();
    if (error) {
        console.error('Validation failed:', error);
        process.exit(1);
    } else {
        console.log('Validation successful.');
        process.exit(0);
    }
} catch (error) {
    console.error('Error loading or using Hospital model:', error);
    process.exit(1);
}
