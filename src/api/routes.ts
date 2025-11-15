import { Router, type Request, type Response } from 'express';
import redisClient from '../services/cache.js'; 
import { TOKEN_CACHE_KEY } from '../services/taskScheduler.js';


const router = Router();
interface AppToken {
    token_address: string;
    token_name: string;
    token_ticker: string;
    price_sol: number;
    market_cap_sol: number;
    volume_sol: number;
    liquidity_sol: number;
    transaction_count: number;
    price_1hr_change: number;
    protocol: string;
  };

router.get('/tokens', async(req: Request, res: Response) =>{
    try{
        const cachedData = await redisClient.get(TOKEN_CACHE_KEY);
        if (!cachedData){
            return res.status(503).json({ 
                message: 'Service unavailable: Data is being populated. Please try again in a moment.' 
              });
        }
        let tokens: AppToken[] = JSON.parse(cachedData);

        const sortBy = req.query.sort as keyof AppToken; 
        const sortOrder = req.query.order as string || 'desc';

        if (sortBy) {
            tokens.sort((a, b) => {
              const aVal = a[sortBy] as number;
              const bVal = b[sortBy] as number;
      
              if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortOrder === 'asc' 
                  ? aVal - bVal 
                  : bVal - aVal;
              }
              return 0; // If data types are wrong, maintain original order
            });
          }
          const limit = parseInt(req.query.limit as string) || 20; 
          const page = parseInt(req.query.page as string) || 1;

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        const paginatedTokens = tokens.slice(startIndex, endIndex);

        res.status(200).json({
            totalTokens: tokens.length,
            page: page,
            limit: limit,
            data: paginatedTokens,
          });
    }
    catch (error) {
        console.error('Error in /api/tokens:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
});
export default router;