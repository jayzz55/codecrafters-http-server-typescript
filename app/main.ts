import * as net from "net";

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
      default:
        socket.write(Buffer.from(`HTTP/1.1 404 Not Found\r\n\r\n`));
    }

    socket.end();
  })
});

server.listen(4221, "localhost");
