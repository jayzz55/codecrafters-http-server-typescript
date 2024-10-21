import * as net from "net";
import * as process from 'process';
import * as zlib from "zlib";
import fs from "fs";

type Request = {
  method: string;
  path: string;
  query: string;
  userAgent: string;
  body: string;
  acceptEncoding: EncodingSchemeKeys[];
}

const HttpMethod = {
  Get: 'GET',
  Post: 'POST'
} as const
type HttpMethodKeys = typeof HttpMethod[keyof typeof HttpMethod]

const HttpStatus = {
  Ok: '200 OK',
  NotFound: '404 Not Found',
  Created: '201 Created'
} as const
type HttpStatusKeys = typeof HttpStatus[keyof typeof HttpStatus]

const EncodingScheme = {
  Gzip: 'gzip',
} as const
type EncodingSchemeKeys = typeof EncodingScheme[keyof typeof EncodingScheme]

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

function readRequest(data: Buffer): Request {
  const request = data.toString();
  const method = request.split(' ')[0]
  const path = request.split(' ')[1]
  const query = path.split('/')[2];
  const headers = request.split("\r\n")
  const body = headers[headers.length - 1]
  const userAgentHeader = headers.find(header => header.includes('User-Agent')) 
  const userAgent = userAgentHeader?.replace('User-Agent: ', '') ?? ''
  const acceptEncodingHeader = headers.find(header => header.includes('Accept-Encoding')) 
  const acceptEncodingInputs = acceptEncodingHeader?.replace('Accept-Encoding: ', '').split(', ') ?? []
  const acceptEncoding = acceptEncodingInputs.filter(encoding => (capitalize(encoding) in EncodingScheme)).map(encoding => encoding as EncodingSchemeKeys)

  return {
    method,
    path,
    query,
    userAgent,
    body,
    acceptEncoding
  }
}

type Response = {
  status: HttpStatusKeys;
  contentLength?: number;
  contentType?: string;
  body?: string | Buffer;
  contentEncoding?: EncodingSchemeKeys[];
}

function buildResponse(data: Response) {
  const contentTypeString = (data.contentType && data.contentType !== '') ? `Content-Type: ${data.contentType}\r\n` : '';
  const contentEncodingString = (data.contentEncoding && data.contentEncoding.length > 0) ? `Content-Encoding: ${data.contentEncoding.join()}\r\n` : '';
  const body =  (data.contentEncoding && data.body && data.contentEncoding.length > 0) ? zlib.gzipSync(data.body) : data.body ?? '';
  const contentLengthString = (body && body.length > 0) ? `Content-Length: ${body.length}\r\n` : '';

  const responseHeader = `HTTP/1.1 ${data.status}\r\n` + contentTypeString + contentLengthString + contentEncodingString + "\r\n"
  return {
    responseHeader: responseHeader,
    responseBody: body
  }
}

const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const request = readRequest(data)
    const directory = process.argv[3];
    const contentEncoding = request.acceptEncoding

    switch (`${request.method}:${request.path}`) {
      case `${HttpMethod.Get}:/`:
        const { responseHeader } = buildResponse({ status: HttpStatus.Ok })
        socket.write(responseHeader)
        break;
      case `${HttpMethod.Get}:/echo/${request.query}`: {
        const body = request.query;
        const { responseHeader, responseBody } = buildResponse({ status: HttpStatus.Ok, contentType: 'text/plain', contentEncoding, body })

        socket.write(responseHeader)
        socket.write(responseBody)
        break;
      }
      case `${HttpMethod.Get}:/user-agent`: {
        const body = request.userAgent;
        const { responseHeader, responseBody } = buildResponse({ status: HttpStatus.Ok, contentType: 'text/plain', contentEncoding, body })

        socket.write(responseHeader)
        socket.write(responseBody)
        break;
      }
      case `${HttpMethod.Get}:/files/${request.query}`:  {
        const filePath = `${directory}/${request.query}`;

        if (fs.existsSync(filePath)) {
          const body = fs.readFileSync(filePath)
          const { responseHeader, responseBody } = buildResponse({ status: HttpStatus.Ok, contentType: 'application/octet-stream', contentEncoding, body })

          socket.write(responseHeader)
          socket.write(responseBody)
        } else {
          const { responseHeader } = buildResponse({ status: HttpStatus.NotFound })
          socket.write(responseHeader)
        }
        break;
      }
      case `${HttpMethod.Post}:/files/${request.query}`: {
        const filePath = `${directory}/${request.query}`;
        fs.writeFileSync(filePath, request.body);
        const { responseHeader } = buildResponse({ status: HttpStatus.Created })

        socket.write(responseHeader)
        break;
      }
      default: {
        const { responseHeader } = buildResponse({ status: HttpStatus.NotFound })

        socket.write(responseHeader)
        break;
      }
    }
    socket.end();
  })
});

server.listen(4221, "localhost");
