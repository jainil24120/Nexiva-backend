const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware"); // destructured
const roleMiddleware = require("../middleware/roleMiddleware");
const inventoryController = require("../controllers/inventorycontroller");

/* =====================================================
   INVENTORY ROUTES
===================================================== */

// Create Inventory Item
router.post(
  "/",
  protect,
  roleMiddleware(["hospital"]),
  inventoryController.createItem
);

// Get all inventory items (hospital wise)
router.get(
  "/",
  protect,
  roleMiddleware(["hospital"]),
  inventoryController.getAllItems
);

// Get single inventory item
router.get(
  "/:id",
  protect,
  roleMiddleware(["hospital"]),
  inventoryController.getSingleItem
);

// Update inventory item
router.put(
  "/:id",
  protect,
  roleMiddleware(["hospital"]),
  inventoryController.updateItem
);

// Delete inventory item
router.delete(
  "/:id",
  protect,
  roleMiddleware(["hospital"]),
  inventoryController.deleteItem
);

module.exports = router;