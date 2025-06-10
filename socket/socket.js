import express from "express";
import { Server } from "socket.io";
import http from "http";
import { getUserDetailsFromToken } from "../middlewares/getUserDetailsFromToken.js";
import User from "../models/UserModel.js";
import { Conversation, Message } from "../models/conversationModel.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

const onlineUsers = new Set();

io.on("connection", async (socket) => {
  console.log("✅ Connected:", socket.id);
  const token = socket.handshake.auth.token;
  const user = await getUserDetailsFromToken(token);

  if (!user) {
    console.log("❌ Invalid user, disconnecting...");
    return socket.disconnect(true);
  }

  const userId = user?._id.toString();
  socket.join(userId);
  onlineUsers.add(userId);

  // Send list of online users
  io.emit("onlineUser", Array.from(onlineUsers));

  // Update Sidebar
  socket.on("sidebar", async (currentUserId) => {
    try {
      const conversations = await Conversation.find({
        $or: [{ sender: currentUserId }, { receiver: currentUserId }],
      })
        .populate("sender receiver lastMessage")
        .sort({ updatedAt: -1 });

      const formattedConversations = conversations.map((conv) => {
        const friend =
          conv.sender._id.toString() === currentUserId
            ? conv.receiver
            : conv.sender;
        return {
          id: friend._id.toString(),
          name: friend.name,
          profile_pic: friend.profile_pic || "/default-avatar.png",
          message: conv.lastMessage
            ? conv.lastMessage.text ||
              (conv.lastMessage.messageType === "image"
                ? "Image"
                : conv.lastMessage.messageType === "video"
                ? "Video"
                : "Audio")
            : "Start a conversation",
          time: conv.lastMessage
            ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          isRead: conv.lastMessage ? conv.lastMessage.isRead : true,
          isArchived: false,
          unreadCount: conv.unreadCount,
        };
      });

      socket.emit("sidebar", formattedConversations);
    } catch (error) {
      console.error("❌ Error fetching sidebar:", error.message);
      socket.emit("error", { message: "Failed to load sidebar" });
    }
  });

  // Send user data and messages based on user and messages page request
  socket.on("message-page", async (targetId) => {
    try {
      const userDetails = await User.findById(targetId).select("-password");
      if (!userDetails) {
        return socket.emit("error", { message: "User not Found" });
      }

      const payload = {
        _id: userDetails?._id,
        name: userDetails?.name,
        email: userDetails?.email,
        profile_pic: userDetails?.profile_pic,
        bio: userDetails?.bio,
        online: onlineUsers.has(targetId),
      };

      const conversation = await Conversation.findOne({
        $or: [
          { sender: userId, receiver: targetId },
          { sender: targetId, receiver: userId },
        ],
      })
        .populate("messages")
        .sort({ updatedAt: -1 });

      // Update message status to read
      if (conversation) {
        await Message.updateMany(
          {
            _id: { $in: conversation.messages },
            sender: targetId,
            isRead: false,
          },
          { isRead: true }
        );
        conversation.unreadCount = 0;
        await conversation.save();

        // Update Sidebar for both users
        io.to(userId).emit("sidebar", await getSidebarData(userId));
        io.to(targetId).emit("sidebar", await getSidebarData(targetId));
      }

      socket.emit("message-user", payload);
      socket.emit("message", conversation || { messages: [] });
    } catch (error) {
      console.error("❌ Error fetching message page:", error.message);
      socket.emit("error", { message: "Failed to load conversation" });
    }
  });

  // Receive new message
  socket.on("new message", async (data) => {
    try {
      const {
        sender,
        receiver,
        text = "",
        imageUrl = "",
        videoUrl = "",
        audioUrl = "",
        messageByUserId,
      } = data;

      if (!sender || !receiver || !messageByUserId) {
        return socket.emit("error", { message: "Missing required fields" });
      }

      let messageType = "text";
      if (imageUrl) messageType = "image";
      else if (videoUrl) messageType = "video";
      else if (audioUrl) messageType = "audio";

      const newMessage = await Message.create({
        sender,
        text,
        imageUrl,
        videoUrl,
        audioUrl,
        messageType,
        messageByUserId,
        isRead: false,
        createdAt: new Date(), // Ensure createdAt is set
      });

      let conversation = await Conversation.findOne({
        $or: [
          { sender, receiver },
          { sender: receiver, receiver: sender },
        ],
      });

      if (!conversation) {
        conversation = await Conversation.create({
          sender,
          receiver,
          messages: [newMessage._id],
          lastMessage: newMessage._id,
          unreadCount: 1,
        });
      } else {
        conversation.messages.push(newMessage._id);
        conversation.lastMessage = newMessage._id;
        conversation.unreadCount = conversation.unreadCount + 1;
        await conversation.save();
      }

      // Format the message to match client expectations
      const formattedMessage = {
        sender: newMessage.sender.toString(),
        text: newMessage.text || "",
        imageUrl: newMessage.imageUrl || "",
        videoUrl: newMessage.videoUrl || "",
        audioUrl: newMessage.audioUrl || "",
        messageType: newMessage.messageType,
        messageByUserId: newMessage.messageByUserId,
        isRead: newMessage.isRead,
        createdAt: newMessage.createdAt,
      };

      // Send new message to both users
      io.to(sender).emit("new message", formattedMessage);
      io.to(receiver).emit("new message", formattedMessage);

      // Update Sidebar for both users
      io.to(sender).emit("sidebar", await getSidebarData(sender));
      io.to(receiver).emit("sidebar", await getSidebarData(receiver));
    } catch (error) {
      console.error("❌ Error sending message:", error.message);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    io.emit("onlineUser", Array.from(onlineUsers));
    console.log("❌ Disconnected:", socket.id);
  });

  socket.on("logout", () => {
    onlineUsers.delete(userId);
    io.emit("onlineUser", Array.from(onlineUsers));
    socket.disconnect();
  });
});

// Helper function to fetch Sidebar data
async function getSidebarData(userId) {
  const conversations = await Conversation.find({
    $or: [{ sender: userId }, { receiver: userId }],
  })
    .populate("sender receiver lastMessage")
    .sort({ updatedAt: -1 });

  return conversations.map((conv) => {
    const friend =
      conv.sender._id.toString() === userId ? conv.receiver : conv.sender;
    return {
      id: friend._id.toString(),
      name: friend.name,
      profile_pic: friend.profile_pic || "/default-avatar.png",
      message: conv.lastMessage
        ? conv.lastMessage.text ||
          (conv.lastMessage.messageType === "image"
            ? "Image"
            : conv.lastMessage.messageType === "video"
            ? "Video"
            : "Audio")
        : "Start a conversation",
      time: conv.lastMessage
        ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      isRead: conv.lastMessage ? conv.lastMessage.isRead : true,
      isArchived: false,
      unreadCount: conv.unreadCount,
    };
  });
}

export { app, server };