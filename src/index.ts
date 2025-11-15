import express, { type Request, type Response } from 'express';
import { fetchAndMergeData } from './services/dataFetcher.js';
const app = express();
const port = process.env.PORT || 3000;

// A test endpoint
app.get('/ping', (req: Request, res: Response) => {
  res.status(200).json({ message: 'pong!' });
});
console.log('Running initail merge data test')
fetchAndMergeData().then((merged_list) => {
    console.log("Initial data fetch test complete.");
    console.log(`Total tokens found: ${merged_list.length}`);
    console.log('Sample Data: ' ,merged_list.slice(0,5));
  })
  .catch((error)=>{
    console.error('Intial fetching of data failed: ' , error);
  })
  
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});