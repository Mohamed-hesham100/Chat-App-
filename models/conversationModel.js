

import mongoose from "mongoose";

const messagesSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    videoUrl: {
      type: String,
    },
    audioUrl: {
      type: String,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "video", "audio"],
      default: "text",
    },
    seen: {
      type: Boolean,
      default: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    messageByUserId: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);


const conversationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.ObjectId,
      required: true,
      ref: "User",
    },
    receiver: {
      type: mongoose.Schema.ObjectId,
      required: true,
      ref: "User",
    },
    messages: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Message",
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messagesSchema);
const Conversation = mongoose.model("Conversation", conversationSchema);

export { Message, Conversation };
