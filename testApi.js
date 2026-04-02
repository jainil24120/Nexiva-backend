const http = require("http");

// Test data
async function runTests() {
  try {
    // Test 1: Register
    await makeRequest("/api/auth/register", "POST", testRequests.register);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Login
    await makeRequest("/api/auth/login", "POST", testRequests.login);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Forgot Password / Send OTP
    await makeRequest("/api/auth/forgot-password", "POST", testRequests.sendOtp);

  } catch (error) {
    console.error("Test failed:", error);
  }
}
