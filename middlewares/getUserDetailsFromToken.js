import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";

export const getUserDetailsFromToken = async (token) => {
  try {
    if (!token) {
      return null;
    }
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const userId = decoded.userInfo.userId;

    const user = await User.findById(userId).select("-password");
    return user;
  } catch (err) {
    console.error("Invalid token", err);
    return null;
  }
};
