import express, { type Request, type Response } from 'express';

const app = express();
const port = process.env.PORT || 3000;

// A test endpoint
app.get('/ping', (req: Request, res: Response) => {
  res.status(200).json({ message: 'pong!' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});