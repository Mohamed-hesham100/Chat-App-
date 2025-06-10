import User from "../models/UserModel.js";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/generateToken.js";

export const register = async (req, res) => {
  try {
    const { name, email, password, profile_pic } = req.body;

    // Check required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email.",
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashPassword,
      profile_pic,
    });

    await newUser.save();

    const { password: _, ...userData } = newUser._doc;

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: userData,
    });
  } catch (error) {
    console.error("Error registration:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user?._id, user.email);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    const { password: _, ...userData } = user._doc;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: userData,
      token,
    });
  } catch (error) {
    console.error("Error login:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || error,
    });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
      error,
    });
  }
};

export const logout = async (_, res) => {
  try {
    res.cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 0,
    });

    return res.status(200).json({
      message: "Logged out successfully.",
      success: true,
    });
  } catch (error) {
    console.error("Error Logout:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || error,
    });
  }
};

export const updateUserDetails = async (req, res) => {
  try {
    const userId = req.userId;

    const { name, profile_pic, bio } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }
    if (typeof name !== "string") {
      return res.status(400).json({
        success: false,
        message: "Name must be string ",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const updateData = { name, profile_pic, bio };
    const updateUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password");
    return res.status(200).json({
      message: "updated data successfully.",
      success: true,
      user: updateUser,
    });
  } catch (error) {
    console.error("Error updateProfile:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || error,
    });
  }
};

export const searchUser = async (req, res) => {
  try {
    const search = req.query.search || "";
    const currentUserId = req.userId;

    const query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
      _id: { $ne: currentUserId },
    };

    const users = await User.find(query).select("-password"); // Without password

    return res.status(200).json({
      success: true,
      message: "Users found",
      users,
    });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const addFriend = async (req, res) => {
  const { friendId } = req.body;
  const userId = req.userId;

  try {
    // if (friendId === userId) {
    //   return res
    //     .status(400)
    //     .json({ success: false, message: "You cannot add yourself as a friend" });
    // }

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!friend) {
      return res
        .status(404)
        .json({ success: false, message: "Friend not found" });
    }

    if (user.friends.includes(friendId)) {
      return res.status(400).json({ success: false, message: "Already added" });
    }

    user.friends.push(friendId);
    await user.save();

    res.json({ success: true, message: "Friend added successfully" });
  } catch (error) {
    console.error("Add Friend Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error occurred during addition" });
  }
};

export const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate(
      "friends",
      "-password"
    );
    res.json({ success: true, friends: user.friends });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch friends" });
  }
};
