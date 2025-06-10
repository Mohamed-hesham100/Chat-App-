import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async () => {
  try {
    const DB_URL = process.env.MONGO_URL;
    if (!DB_URL) {
      throw new Error("❌ DATABASE_URL is not defined in .env file");
    }

    await mongoose.connect(DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ Database Connection error: ", error.message);
    process.exit(1);
  }
};

export default connectDB;
