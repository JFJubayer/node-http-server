import { createServer } from './app.js';

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '127.0.0.1';

const server = createServer();

server.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE' ? `Port ${port} is already in use. Try: PORT=3001 npm start` : err.message);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});
