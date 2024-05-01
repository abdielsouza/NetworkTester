const { Server } = require('socket.io');
const http = require('http');
const express = require('express');
const path = require('path');
const cors = require('cors');
const speedTest = require('speedtest-net');

// Create an express app and use cors. It will be passed next below to the http server instance.
const app = express().use(cors());
// Create a http server instance.
const httpServer = new http.createServer(app);
// Create an agent for permanent connection.
const agent = new http.Agent({keepAlive: true});

// Create a server-side for the socket. Listening the http server.
const io = new Server(httpServer, {
    cors: {
        origin: "*"
    },
    serveClient: true
}).listen(httpServer);

// Tell the app to use static files from the build path of our react application.
app.use(express.static(path.resolve(__dirname, '../net-tester/build')));

// Tell the app that any other "get" requests will return our "index.html", the final product of our react app.
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../net-tester/build', 'index.html'));
});

io.on('connection', socket => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('get_measures_request', async () => {
        console.log("Received request!");

        speedTest({acceptLicense: true, acceptGdpr: true, cancel: (symbol) => {
            io.on('abort', () => symbol = true);
        }}).then((response) => {
            io.emit('get_measures_response', response);
            console.log("Returned response!");
        })
        .catch((reason) => {
            io.emit('response_failed', reason);
            console.error(`response failed: ${reason}`);
        });
    });

    socket.on('connection_error', error => {
        console.error(error);
    });

    socket.on('disconnection', () => {
        console.log(`socket disconnected: ${socket.id}`);
        io.close();
    });
});

io.on('disconnect', socket => {
    io.disconnectSockets();
    console.log("Socket closed!");
});

httpServer.listen(4000, () => {
    console.log("listening!");
});