import { io } from "socket.io-client";
import { API_BASE_URL } from "./services";

export const socket = io(API_BASE_URL || "https://hookprism.onrender.com", {
  transports: ["websocket", "polling"],
  reconnection: true,
});

export default socket;
