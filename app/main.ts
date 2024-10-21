import * as net from "net";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const request = data.toString();
    const path = request.split(' ')[1]
    const response = path === '/' ? '200 OK' : '404 Not Found'

    socket.write(Buffer.from(`HTTP/1.1 ${response}\r\n\r\n`));
    socket.end();
  })
});

server.listen(4221, "localhost");
