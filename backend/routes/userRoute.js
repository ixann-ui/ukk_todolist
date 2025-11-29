import express from "express";
import db from "../db.js";
import bcrypt from "bcrypt";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
  db.query(sql, [name, email, hash], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    // Return created user info (useful for frontend)
    const user = {
      id: results && results.insertId ? results.insertId : null,
      name,
      email,
    };
    res.json({ success: true, message: "Account created", user });
  });
});

// Login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err });

    if (results.length === 0)
      return res.status(400).json({ error: "Email not found" });

    const valid = await bcrypt.compare(password, results[0].password);
    if (!valid) return res.status(400).json({ error: "Wrong password" });

    // Return both `name` and `username` to be compatible with frontend expectations
    res.json({
      success: true,
      user: {
        id: results[0].id,
        name: results[0].name,
        username: results[0].name,
        email: results[0].email,
      },
    });
  });
});

export default router;
