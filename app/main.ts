import * as net from "net";
import * as process from 'process';
import fs from "fs";

type Request = {
  httpVersion: string;
  path: string;
  query: string;
  userAgent: string;
}

function readRequest(data: Buffer): Request {
  const request = data.toString();
  const path = request.split(' ')[1]
  const query = path.split('/')[2];
  const headers = request.split("\r\n")
  const userAgentHeader = headers.find(header => header.includes('User-Agent')) 
  const userAgent = userAgentHeader?.replace('User-Agent: ', '') ?? ''

  return {
    httpVersion: 'HTTP/1.1',
    path: path,
    query: query,
    userAgent: userAgent
  }
}

const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const request = readRequest(data)

    switch(request.path) {
      case '/':
        socket.write(Buffer.from(`HTTP/1.1 200 OK\r\n\r\n`));
        break;
      case `/echo/${request.query}`:
        socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${request.query.length}\r\n\r\n${request.query}`)
        break;
      case '/user-agent':
        socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${request.userAgent.length}\r\n\r\n${request.userAgent}`)
        break;
      case `/files/${request.query}`: 
        const directory = process.argv[3];
        const filePath = `${directory}/${request.query}`;

        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath)
          socket.write(`HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${content.length}\r\n\r\n${content}`)
        } else {
          socket.write(Buffer.from(`HTTP/1.1 404 Not Found\r\n\r\n`));
        }
        break;
      default:
        socket.write(Buffer.from(`HTTP/1.1 404 Not Found\r\n\r\n`));
    }

    socket.end();
  })
});

server.listen(4221, "localhost");
