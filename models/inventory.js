const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    hospital_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },

    item_name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: ["blood", "medicine", "injection", "equipment", "other"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    unit: {
      type: String,
      required: true, // bottles, units, packs etc.
    },

    expiry_date: {
      type: Date,
    },

    supplier_name: {
      type: String,
      trim: true,
    },

    cost_per_unit: {
      type: Number,
      min: 0,
    },

    last_updated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

// Optional: Prevent duplicate item per hospital
inventorySchema.index(
  { hospital_id: 1, item_name: 1 },
  { unique: true }
);

module.exports = mongoose.model("inventory", inventorySchema);