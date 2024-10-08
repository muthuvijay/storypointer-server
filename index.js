import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { generate } from "random-words";

import ChannelManager from "./src/ChannelManager.js";

// Create an Express app
const app = express();
const server = http.createServer(app);

// Initialize socket.io
const io = new Server(server);

// Middleware to handle CORS
io.use((socket, next) => {
  socket.request.headers.origin = "*";
  next();
});

app.use(cors());

const channelManager = new ChannelManager();

const getChannelName = () => {
  const channelName = generate({
    exactly: 1,
    wordsPerString: 2,
    separator: "-",
    formatter: (word) => word.toUpperCase(),
  });
  return channelName[0]; //generates an array
};

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log("A Client connected", socket.id, new Date());

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });

  // Handle incoming messages
  socket.on("message", (data) => {
    console.log("Message received:", data);
  });

  function getNs(domain, channel) {
    return `/${domain}-${channel}`;
  }

  function createOrJoinNs(domain, channel, name, isCreator = false) {
    const namespace = getNs(domain, channel);
    const nsIO = io.of(namespace);

    nsIO.on("connection", (nsSocket) => {
      // nsSocket.join(channel);
      const participants = channelManager.addParticipant(
        channel,
        name,
        isCreator
      );
      nsSocket.emit("welcome", `You are in the ${namespace} namespace`);
      nsSocket.emit("PARTICIPANTS", Array.from(participants.values()));
      nsSocket.emit("joined_room", "User joined the room");
    });
  }

  function updateParticipants(channel, name, domain) {
    const participants = channelManager.addParticipant(channel, name);
    const nsSocket = io.of(getNs(domain, channel));
    nsSocket.emit("PARTICIPANTS", Array.from(participants.values()));
  }

  socket.on("CREATE_CHANNEL", ({ name, domain }, callback) => {
    const channel = getChannelName();
    //create a namespace for the channel
    createOrJoinNs(domain, channel, name, true);
    // updateParticipants(channel, name, domain);

    console.log(`User ${name} created channel ${channel} on domain ${domain}`);

    // send the namespace to the caller
    callback(getNs(domain, channel), channel);
  });

  socket.on("JOIN_CHANNEL", ({ channel, name, domain }, callback) => {
    console.log(`User ${name} joined channel ${channel} on domain ${domain}`);

    if (io._nsps.has(getNs(domain, channel))) {
      if (!name || !channel) {
        console.log("No name or channel to Join");
        return;
      }
      // Check if channel exists
      /* f (!ChannelManager isChannelExists(channel)) {
        console.log('Channel does not exist', channel);
        return;
      } */

      // createOrJoinNs(domain, channel, name);
      updateParticipants(channel, name, domain);

      // send the namespace to the caller
      callback.apply(this, [getNs(domain, channel), channel]);
    } else {
      // TODO: send the message to the caller
      console.log("Channel does not exist to join", channel);
    }
  });

  socket.on("LEAVE_CHANNEL", ({ channel, name, domain }) => {
    console.log(`User ${name} left channel ${channel} on domain ${domain}`);
    if (name && channel) {
      const participants = channelManager.getParticipants(channel);

      if (participants && participants.has(name)) {
        participants.delete(name);
        channelManager.setParticipants(channel, participants);

        const nsSocket = io.of(getNs(domain, channel));
        nsSocket.emit("PARTICIPANTS_REMAIN", Array.from(participants.values()));
      }
    } else {
      console.log("No name or channel to remove");
    }
  });

  socket.on("GET_LAST_QUERY", ({ channel, domain }) => {
    const getLastQuestion = channelManager.getLastQuestion(channel);
    console.log(
      `Last question: ${getLastQuestion} in channel ${channel} on domain ${domain}`
    );

    if (!getLastQuestion) {
      console.log("No last question", channel);
      return;
    }
    const ns = getNs(domain, channel);
    const nsSocket = io.of(ns);
    nsSocket.emit("VOTE_FOR_QUESTION", getLastQuestion);
  });

  socket.on("SELECTED_QUESTIONS", ({ channel, question, domain }) => {
    console.log(
      `Selected question: ${question} in channel ${channel} on domain ${domain}`
    );

    const result = channelManager.addQuestion(channel, question);

    const ns = getNs(domain, channel);
    const nsSocket = io.of(ns);
    if (!result) {
      socket.emit("CHANNEL_NOT_FOUND", { channel, ns });
      return;
    }
    /* if (!questions.has(question)) {
      questions.set(question, []);
    } */
    // io.to(channel).emit("VOTE_FOR_QUESTION", question);
    // io.emit("VOTE_FOR_QUESTION", question);

    nsSocket.emit("VOTE_FOR_QUESTION", question);
  });

  socket.on(
    "VOTED_FOR_QUESTION",
    ({ channel, question, user, value, domain }) => {
      console.log(
        `User ${user} voted ${value} for question ${question} in channel ${channel} on domain ${domain}`
      );
      /* const votes = questions.get(question);
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
    io.emit("REVEAL_VOTES", { question, votes }); */

      const votes = channelManager.addVotesToQuestion(
        channel,
        question,
        user,
        value
      );
      const nsSocket = io.of(getNs(domain, channel));
      nsSocket.emit("REVEAL_VOTES", { question, votes });
    }
  );
});
// Define a route
app.get("/", (req, res) => {
  res.send("Socket Server is running");
});

app.get("/index.html", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

//REST APIs

app.get("/api/channels", (req, res) => {
  const output = {};
  const channels = Array.from(channelManager.getChannels());
  // iterate over the channels and get the participants
  for (const [channel, data] of channels) {
    output[channel] = {
      ...data,
      participants: Array.from(data.participants),
      questions: Array.from(data.questions),
    };
  }
  res.json(output);
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
