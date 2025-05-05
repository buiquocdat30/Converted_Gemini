const express = require("express");
const router = express.Router();
const authService = require("../services/authService");

router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    console.log("đây là authService khi signup:",authService.registerUser)
    const { token } = await authService.registerUser(username, email, password);
    res.status(201).json({ success: true, token });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log("đây là authService khi login:",authService.loginUser)
    const { token } = await authService.loginUser(email, password);
    res.json({ success: true, token });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

module.exports = router;