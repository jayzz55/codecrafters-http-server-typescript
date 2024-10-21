import * as net from "net";
import * as process from 'process';
import fs from "fs";

type Request = {
  method: string;
  httpVersion: string;
  path: string;
  query: string;
  userAgent: string;
  body: string;
}

const HttpMethod = {
  Get: 'GET',
  Post: 'POST'
} as const
type HttpMethodKeys = typeof HttpMethod[keyof typeof HttpMethod]

function readRequest(data: Buffer): Request {
  const request = data.toString();
  const method = request.split(' ')[0]
  const path = request.split(' ')[1]
  const query = path.split('/')[2];
  const headers = request.split("\r\n")
  const body = headers[headers.length - 1]
  const userAgentHeader = headers.find(header => header.includes('User-Agent')) 
  const userAgent = userAgentHeader?.replace('User-Agent: ', '') ?? ''

  return {
    httpVersion: 'HTTP/1.1',
    method,
    path,
    query,
    userAgent,
    body
  }
}

const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const request = readRequest(data)
    const directory = process.argv[3];

    switch (`${request.method}:${request.path}`) {
      case `${HttpMethod.Get}:/`:
        socket.write(Buffer.from(`HTTP/1.1 200 OK\r\n\r\n`));
        break;
      case `${HttpMethod.Get}:/echo/${request.query}`:
        socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${request.query.length}\r\n\r\n${request.query}`)
        break;
      case `${HttpMethod.Get}:/user-agent`:
        socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${request.userAgent.length}\r\n\r\n${request.userAgent}`)
        break;
      case `${HttpMethod.Get}:/files/${request.query}`:  {
          const filePath = `${directory}/${request.query}`;

          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath)

            socket.write(`HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${content.length}\r\n\r\n${content}`)
          } else {
            socket.write(Buffer.from(`HTTP/1.1 404 Not Found\r\n\r\n`));
          }
          break;
        }
      case `${HttpMethod.Post}:/files/${request.query}`: {
          const filePath = `${directory}/${request.query}`;
          fs.writeFileSync(filePath, request.body);
          socket.write(Buffer.from(`HTTP/1.1 201 Created\r\n\r\n`));
          break;
        }
      default:
        socket.write(Buffer.from(`HTTP/1.1 404 Not Found\r\n\r\n`));
        break;
    }

    socket.end();
  })
});

server.listen(4221, "localhost");
