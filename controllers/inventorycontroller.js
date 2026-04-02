const InventoryItem = require("../models/inventory");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");  

/* =====================================================
   CREATE INVENTORY ITEM
   POST /api/inventory
===================================================== */
exports.createItem = async (req, res,next) => {
  try {
    const hospital_id = req.user.id; // from auth middleware

    const {
      item_name,
      category,
      quantity,
      unit,
      expiry_date,
      supplier_name,
      cost_per_unit,
    } = req.body;

    const item = await InventoryItem.create({
      hospital_id,
      item_name,
      category,
      quantity,
      unit,
      expiry_date,
      supplier_name,
      cost_per_unit,
    });

    res.status(201).json({
      success: true,
      message: "Inventory item created successfully",
      data: item,
    });
  } catch (err) {
  next(err)
}
};

/* =====================================================
   GET ALL INVENTORY ITEMS (Hospital Wise)
   GET /api/inventory
===================================================== */
exports.getAllItems = async (req, res,next) => {
  try {
    const hospital_id = req.user.id;

    const items = await InventoryItem.find({ hospital_id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (err) {
  next(err)
}
};

/* =====================================================
   GET SINGLE ITEM
   GET /api/inventory/:id
===================================================== */
exports.getSingleItem = async (req, res,next) => {
  try {
    const hospital_id = req.user.id;

    const item = await InventoryItem.findOne({
      _id: req.params.id,
      hospital_id,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (err) {
  next(err)
}
};

/* =====================================================
   UPDATE ITEM
   PUT /api/inventory/:id
===================================================== */
exports.updateItem = async (req, res,next) => {
  try {
    const hospital_id = req.user.id;

    const item = await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, hospital_id },
      { ...req.body, last_updated: Date.now() },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Item updated successfully",
      data: item,
    });
  } catch (err) {
  next(err)

  }
};

/* =====================================================
   DELETE ITEM
   DELETE /api/inventory/:id
===================================================== */
exports.deleteItem = async (req, res,next) => {
  try {
    const hospital_id = req.user.id;

    const item = await InventoryItem.findOneAndDelete({
      _id: req.params.id,
      hospital_id,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Item deleted successfully",
    });
  } catch (err) {
  next(err)
}
};