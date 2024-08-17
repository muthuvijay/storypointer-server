// Import necessary modules
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
// Create an Express app
const app = express();
const server = http.createServer(app);

// Initialize socket.io
const io = socketIO(server);

// Middleware to handle CORS
io.use((socket, next) => {
  socket.request.headers.origin = "*"; // Change "*" to the allowed origin if needed
  next();
});

app.use(cors());

const channels = new Map();

const questions = new Map();

/* questions.set("testing", [
  { user: "test", value: 5 },
  { user: "Test", value: 5 },
]); */

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });

  // Handle incoming messages
  socket.on("message", (data) => {
    console.log("Message received:", data);
    // Broadcast the message to all connected clients
    io.emit("message", data);
  });

  socket.on("JOIN_CHANNEL", ({ channel, name }) => {
    console.log(`User ${name} joined channel ${channel}`);
    if (!name || !channel) {
      console.log("No name or channel to Join");
      return;
    }
    // Create channel if not exists
    if (!channels.has(channel)) {
      channels.set(channel, new Set());
      socket.join(channel);
    }
    // Add user to channel
    const participants = channels.get(channel);
    participants.add(name);
    channels.set(channel, participants);

    // Send list of participants to all users in the channel
    // io.to(channel).emit("PARTICIPANTS", Array.from(participants.values()));
    io.emit("PARTICIPANTS", Array.from(participants.values()));
  });

  socket.on("LEAVE_CHANNEL", ({ channel, name }) => {
    console.log(`User ${name} left channel ${channel}`);
    if (name && channel) {
      const participants = channels.get(channel);
      participants.delete(name);
      channels.set(channel, participants);
      // io.to(channel).emit("PARTICIPANTS", Array.from(participants.values()));
      io.emit("PARTICIPANTS", Array.from(participants.values()));
    } else {
      console.log("No name or channel to remove");
    }
  });

  socket.on("SELECTED_QUESTIONS", ({ channel, question }) => {
    console.log(`Selected question: ${question}`);
    if (!questions.has(question)) {
      questions.set(question, []);
    }
    // io.to(channel).emit("VOTE_FOR_QUESTION", question);
    io.emit("VOTE_FOR_QUESTION", question);
  });

  socket.on("VOTED_FOR_QUESTION", ({ channel, question, user, value }) => {
    console.log(`User ${user} voted ${value} for question ${question}`);
    const votes = questions.get(question);
    // Check if user already voted
    const userVoted = votes.find((vote) => vote.user === user);
    if (userVoted) {
      userVoted.value = value;
    } else {
      votes.push({ user, value });
      questions.set(question, votes);
    }

    console.log(questions);
    // io.to(channel).emit("REVEAL_VOTES", question);
    io.emit("REVEAL_VOTES", { question, votes });
  });
});
// Define a route
app.get("/", (req, res) => {
  res.send("Socket Server is running");
});

app.get("/index.html", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
