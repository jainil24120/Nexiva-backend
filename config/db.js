const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Drop old email-only unique index if it exists (replaced by email+role compound index)
    try {
      const collection = conn.connection.db.collection("users");
      const indexes = await collection.indexes();
      const oldEmailIndex = indexes.find(
        (idx) => idx.name === "email_1" && idx.unique === true && !idx.key.role
      );
      if (oldEmailIndex) {
        await collection.dropIndex("email_1");
        console.log("Dropped old email_1 unique index (now using email+role compound index)");
      }
    } catch (err) {
      // Index might not exist, that's fine
      if (err.code !== 27) console.log("Index migration note:", err.message);
    }

    // Auto-reconnect on disconnect (e.g. after PC sleep)
    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected. Attempting reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected.");
    });

  } catch (error) {
    console.error("Database connection failed:");
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
