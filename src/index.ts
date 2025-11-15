import express, { type Request, type Response } from 'express';
import { createServer } from 'http';
import {startTaskScheduler} from './services/taskScheduler.js';
import { Server as SocketIOServer } from 'socket.io';
import apiRoutes from './api/routes.js'
const app = express();
const port = process.env.PORT || 3000;

const httpServer = createServer(app);

//websocket central server 
const io = new SocketIOServer(httpServer, {
  cors: {
      origin: '*', // Allow connections from any frontend origin (for testing/demo)
      methods: ['GET', 'POST']
  }
});

app.use('/api',apiRoutes)
// A test endpoint
app.get('/ping', (req: Request, res: Response) => {
  res.status(200).json({ message: 'pong!' });
});


startTaskScheduler(io);

//websocket connection events 
io.on('connection', (socket) => {
  console.log(` Client connected: ${socket.id}. Total clients: ${io.engine.clientsCount}`);
  socket.on('disconnect', () => {
      console.log(` Client disconnected: ${socket.id}. Total clients: ${io.engine.clientsCount}`);
  });
});

httpServer.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`WebSocket running on ws://localhost:${port}`);
});