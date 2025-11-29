import express from "express";
import cors from "cors";

import userRoute from "./routes/userRoute.js";
import listsRoute from "./routes/listsRoute.js";
import tasksRoute from "./routes/tasksRoute.js";

const app = express();
app.use(cors());
app.use(express.json());

// Routes (expose under /api/* so frontend can call /api/tasks etc.)
app.use("/api/users", userRoute);
app.use("/api/lists", listsRoute);
app.use("/api/tasks", tasksRoute);

app.listen(5000, () => console.log("Server berjalan pada port 5000"));
