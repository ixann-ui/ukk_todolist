import express from "express";
import db from "../db.js";

const router = express.Router();

// Create task
router.post("/", (req, res) => {
  console.log("TASK BODY:", req.body);
  // Accept either `list_id` (frontend) or `lists_id` (DB schema)
  const { user_id, lists_id, title, description, list_id } = req.body;
  const listId = lists_id || list_id || null;

  // allow tasks without an associated list (listId can be null)
  if (!user_id || !title) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const sql = `
    INSERT INTO tasks (user_id, lists_id, title, description)
    VALUES (?, ?, ?, ?)
  `;

  // If listId is null, pass null so DB can store NULL
  db.query(sql, [user_id, listId, title, description], (err, result) => {
    if (err) return res.status(500).json({ error: err });

    res.json({ success: true, task: { id: result.insertId } });
  });
});

// Get all tasks (fallback for frontend that requests /api/tasks)
router.get("/", (req, res) => {
  // Require an authenticated user id to return tasks.
  // Look for user id in query param `userId` or header `x-user-id`.
  const userId = req.query.userId || req.header("x-user-id");
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Support different possible column names in the tasks table (user_id, userId, ownerId)
  const sql = `
    SELECT * FROM tasks
    WHERE user_id = ? OR userId = ? OR ownerId = ?
    ORDER BY id DESC
  `;

  db.query(sql, [userId, userId, userId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// Get tasks by list
router.get("/:user_id/:lists_id", (req, res) => {
  const { user_id, lists_id } = req.params;

  const sql = `
    SELECT * FROM tasks 
    WHERE user_id = ? AND lists_id = ?
    ORDER BY id DESC
  `;

  db.query(sql, [user_id, lists_id], (err, results) => {
    if (err) return res.status(500).json({ error: err });

    res.json(results);
  });
});

// Get tasks for a user (all lists)
router.get("/user/:user_id", (req, res) => {
  const { user_id } = req.params;

  const sql = `
    SELECT * FROM tasks
    WHERE user_id = ?
    ORDER BY id DESC
  `;

  db.query(sql, [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err });

    res.json(results);
  });
});

// Update a task (title, lists_id, description)
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { title, description, lists_id, list_id } = req.body;
  const listId = lists_id || list_id || null;

  if (!title && description === undefined && listId === null) {
    return res.status(400).json({ message: "No fields to update" });
  }

  const sql = `
    UPDATE tasks
    SET title = COALESCE(?, title), lists_id = COALESCE(?, lists_id), description = COALESCE(?, description)
    WHERE id = ?
  `;

  db.query(sql, [title, listId, description, id], (err, result) => {
    if (err) return res.status(500).json({ error: err });

    res.json({ success: true, task: { id } });
  });
});

// Delete task
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM tasks WHERE id = ?";

  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ error: err });

    res.json({ success: true });
  });
});

export default router;
