import mysql from "mysql2";

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "ukk_todolist",
});

db.connect((err) => {
  if (err) {
    console.log("Database error:", err);
    return;
  }
  console.log("MySQL Terhubung.");
});

export default db;
