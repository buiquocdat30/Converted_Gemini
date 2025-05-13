const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

// Get current user profile
router.get("/profile", authMiddleware, userController.getCurrentUserProfile);

// Update current user profile
router.put("/profile", authMiddleware, userController.updateCurrentUserProfile);

// Change password
router.put("/change-password", authMiddleware, userController.updateCurrentUserProfile);


//các hàm quản lý user cho admin panel
// Create a new user
router.post("/", userController.createUser);

// Get all users
router.get("/", userController.getAllUsers);

// Get user by ID
router.get("/:id", userController.getUserById);

// Get user by email
router.get("/email/:email", userController.getUserByEmail);

// Update user
router.put("/:id", userController.updateUser);

// Delete user
router.delete("/:id", userController.deleteUser);

module.exports = router;
