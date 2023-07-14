const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const mongoose = require('mongoose');

let chatrooms = new Map();

mongoose.connect(
  'mongodb+srv://aditya:aditya@cluster0.oic6x.mongodb.net/chatdb?retryWrites=true&w=majority',
  { useNewUrlParser: true }
);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log('Connected to MongoDB');
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
  console.log('a user connected');
  socket.on('disconnect', function () {
    console.log('user disconnected');
  });

  socket.on('chat message', function (msg) {
    console.log('message: ' + msg);

    socket.emit('chat message', msg);
  });

  socket.on('create room', function (data) {
    let roomPassphrase = data.passphrase;
    let roomName = data.room;
    if (chatrooms.has(roomPassphrase)) {
      socket.emit(
        'update',
        'This room is already existing. Please change your passphrase.'
      );
    } else if (data.room != '') {
      socket.room = data.room;
      socket.join(socket.room);
      console.log('room created', data.room);
      chatrooms.set(roomPassphrase, [roomName, [socket.id]]); // create a new room
      socket.emit('update', 'Room created ' + socket.room);
    }
  });

  socket.on('join room', function (data) {
    let roomPassphrase = data.passphrase;
    let roomName = data.room;

    // Join room outside of if conditions
    socket.join(roomName);

    if (chatrooms.has(roomPassphrase)) {
      if (chatrooms.get(roomPassphrase)[1].length < 2) {
        socket.room = roomName;
        chatrooms.get(roomPassphrase)[1].push(socket.id);
        socket.emit('update', `Joined room : ${socket.room}`);
      } else {
        socket.emit('update', 'This room is already full.');
      }
    } else {
      socket.emit(
        'update',
        'This room does not exist. Please enter valid passphrase.'
      );
    }
  });

  socket.on('end chat', function (data) {
    let choice = data.choice;
    if (choice == 'discard') {
      Message.remove({ room: socket.room }).then(function () {
        console.log('Chat history has been discarded.');
      });
    }
    socket.leave(socket.room);
  });
});

server.listen(8080, () => {
  console.log('Server started - http://localhost:8080');
});
