import express from "express";
import db from "../db.js";

const router = express.Router();

// Create list
router.post("/", (req, res) => {
  console.log("LIST BODY:", req.body); // DEBUG
  const { user_id, name } = req.body;

  if (!user_id || !name) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const sql = "INSERT INTO lists (user_id, name) VALUES (?, ?)";

  db.query(sql, [user_id, name], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true, list: { id: result.insertId, name, user_id } });
  });
});

// Get all lists (fallback for frontend that requests /api/lists)
router.get("/", (req, res) => {
  const sql = `SELECT * FROM lists ORDER BY id DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// Get all lists by user
router.get("/:user_id", (req, res) => {
  const { user_id } = req.params;

  const sql = "SELECT * FROM lists WHERE user_id = ?";
  db.query(sql, [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err });

    res.json(results);
  });
});

// Delete list
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM lists WHERE id = ?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

export default router;
