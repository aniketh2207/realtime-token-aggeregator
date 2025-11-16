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
  price_24hr_change: number;
  price_7d_change: number;
  protocol: string;
}
//list of keys that are valid to be used for sorting the api data
const VALID_SORT_KEYS: (keyof AppToken)[] = [
  'price_sol',
  'market_cap_sol',
  'volume_sol',
  'liquidity_sol',
  'transaction_count',
  'price_1hr_change',
  'price_24hr_change',
  'price_7d_change',
];
router.get('/tokens', async(req: Request, res: Response) =>{
    try{
        const cachedData = await redisClient.get(TOKEN_CACHE_KEY);
        if (!cachedData){
            return res.status(503).json({ 
                message: 'Service unavailable: Data is being populated. Please try again in a moment.' 
              });
        }
        let tokens: AppToken[] = JSON.parse(cachedData);


        let sortBy = req.query.sort as keyof AppToken;
        const sortOrder = (req.query.order as string) || 'desc';

        if (!VALID_SORT_KEYS.includes(sortBy)) {
          sortBy = 'volume_sol'; // Default sort
        }

        tokens.sort((a, b) => {
        const aVal = a[sortBy] as number;
        const bVal = b[sortBy] as number;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
          const limit = parseInt(req.query.limit as string) || 20; 
          const cursor = req.query.cursor as string | undefined;

          let startIndex = 0;

          if(cursor){
            const cursorIndex = tokens.findIndex(t => t.token_address === cursor);
            if (cursorIndex !== -1){
              startIndex = cursorIndex + 1;
            }
          }

          const endIndex = startIndex + limit;
          const paginatedTokens = tokens.slice(startIndex, endIndex);

        let nextCursor: string | null = null;

        if (paginatedTokens.length > 0 && endIndex < tokens.length) {
          nextCursor = paginatedTokens[paginatedTokens.length - 1]?.token_address ?? null;
        }

        res.status(200).json({
            totalTokens: tokens.length,
            next_cursor:nextCursor,
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