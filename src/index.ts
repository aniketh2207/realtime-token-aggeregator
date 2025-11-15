import express, { type Request, type Response } from 'express';
import {startTaskScheduler} from './services/taskScheduler.js';
import apiRoutes from './api/routes.js'
const app = express();
const port = process.env.PORT || 3000;

app.use('/api',apiRoutes)
// A test endpoint
app.get('/ping', (req: Request, res: Response) => {
  res.status(200).json({ message: 'pong!' });
});


startTaskScheduler();
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});