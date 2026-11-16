import { io } from "socket.io-client";
import { API_BASE_URL } from "./services";

export const socket = io(API_BASE_URL || "http://localhost:3000", {
  transports: ["websocket", "polling"],
  reconnection: true,
});
