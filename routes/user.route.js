import express from "express";
const router = express.Router();
import {
  addFriend,
  getUserDetails,
  login,
  logout,
  register,
  searchUser,
  updateUserDetails,
  getFriends,
} from "../controller/user.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/user-details", isAuthenticated, getUserDetails);
router.put("/update-user", isAuthenticated, updateUserDetails);
router.get("/search-user", isAuthenticated, searchUser);
router.post("/add-friend", isAuthenticated, addFriend);
router.get("/friends", isAuthenticated, getFriends);

export default router;
