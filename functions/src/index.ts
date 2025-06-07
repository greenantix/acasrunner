import * as functions from 'firebase-functions';
// import { createServer } from 'http';
import next from 'next';
import type { Request, Response } from 'express'; // 👈 Add this

const app = next({ dev: false, conf: { distDir: '.next' } });
const handle = app.getRequestHandler();

exports.nextApp = functions.https.onRequest((req: Request, res: Response) => {
  app.prepare().then(() => handle(req, res));
});
