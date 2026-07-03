import { createServer } from 'http';
import app from '../server/src/app';

let server: ReturnType<typeof createServer>;

export default function handler(req: any, res: any) {
  if (!server) server = createServer(app);
  server.emit('request', req, res);
}
