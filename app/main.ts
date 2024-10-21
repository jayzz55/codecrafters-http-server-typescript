import * as net from "net";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const request = data.toString();
    const path = request.split(' ')[1]
    const query = path.split('/')[2];

    if (path === '/') {
      socket.write(Buffer.from(`HTTP/1.1 200 OK\r\n\r\n`));
    } else if (path === `/echo/${query}`) {
      socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${query.length}\r\n\r\n${query}`)
    } else if (path === '/user-agent') {
      const headers = request.split("\r\n")
      const userAgentHeader = headers.find(header => header.includes('User-Agent')) 
      const userAgent = userAgentHeader?.replace('User-Agent: ', '')

      socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${userAgent?.length}\r\n\r\n${userAgent}`)
    } else {
      socket.write(Buffer.from(`HTTP/1.1 404 Not Found\r\n\r\n`));
    };

    socket.end();
  })
});

server.listen(4221, "localhost");
