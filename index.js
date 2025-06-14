import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from './config/connectDB.js';
import { app, server } from "./socket/socket.js";
import userRoute from "./routes/user.route.js";
import express from "express";

dotenv.config();

// middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "https://chat-app-hb1u.vercel.app",
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.send("🚀 Backend API is running...");
});

app.use("/api/user", userRoute);

// Connect DB & start server
connectDB().then(() => {
  const PORT = process.env.PORT || 8000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🟢 Server is running on http://0.0.0.0:${PORT}`);
  });
});
