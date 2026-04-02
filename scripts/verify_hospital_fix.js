const bcrypt = require('bcryptjs');

// Mock Mongoose Schema for testing pre-save hooks
const hooks = {};
const mockSchema = {
    pre: (event, callback) => {
        hooks[event] = callback;
    },
    methods: {}
};

// Replicate the logic from Hospital.js
// ---------------------------------------------------------
mockSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next(); // This is the FIX we added
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});
// ---------------------------------------------------------

// Mock Document
class MockHospital {
    constructor(data) {
        this.password = data.password;
        this._modifiedPaths = new Set(['password']); // Simulate 'password' being modified initially
    }

    isModified(path) {
        return this._modifiedPaths.has(path);
    }

    async save() {
        // Run pre-save hook
        return new Promise((resolve, reject) => {
            hooks['save'].call(this, async () => {
                // Save logic would go here
                this._modifiedPaths.clear(); // Clear modified paths after save
                resolve(this);
            });
        });
    }
}

async function runTest() {
    console.log("---------------------------------------------------");
    console.log("🧪 Testing Hospital Password Hashing Fix");
    console.log("---------------------------------------------------");

    const plainPassword = "superSecretPassword123";

    // 1. Simulate Registration (Controller passes plain password now)
    console.log(`\n1. Creating new Hospital with password: "${plainPassword}"`);
    const hospital = new MockHospital({ password: plainPassword });

    // Simulate save
    await hospital.save();

    console.log(`   Saved Password Hash: ${hospital.password}`);

    const isMatch = await bcrypt.compare(plainPassword, hospital.password);
    if (isMatch) {
        console.log("   ✅ SUCCESS: Password hashed correctly (Single Hash)");
    } else {
        console.error("   ❌ FAILURE: Password hash mismatch (Double Hash or Wrong Hash)");
    }

    // 2. Simulate Update (e.g. updating name) without changing password
    console.log("\n2. Updating Hospital Info (NOT changing password)...");
    const oldHash = hospital.password;

    // In a real mongoose doc, modifying a path adds it to modifiedPaths. 
    // We are NOT adding 'password' to modifiedPaths here.

    await hospital.save();

    console.log(`   New Password Hash:   ${hospital.password}`);

    if (hospital.password === oldHash) {
        console.log("   ✅ SUCCESS: Password was NOT re-hashed");
    } else {
        console.error("   ❌ FAILURE: Password WAS re-hashed (Fix failed)");
    }

    console.log("\n---------------------------------------------------");
}

runTest();
