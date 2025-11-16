import { Redis } from 'ioredis';
import { Server as SocketIOServer } from 'socket.io';

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
  }


  const PRICE_THRESHOLD = 0.05; //5% price change
const VOLUME_THRESHOLD = 100;// 10000 SOL volume threshold change

export async function compareAndUpdateCache(
    newTokenList: AppToken[],
    redisClient: Redis,
    io: SocketIOServer
  ){

    const oldDataJson = await redisClient.get('tokens:all');
    const cacheKey = 'tokens:all';

    if (!oldDataJson) {
        // If no old data exists (first run), just save the new data and exit.
        await redisClient.set(cacheKey, JSON.stringify(newTokenList), 'EX', 90);
        return;
    }

    const oldTokenList: AppToken[] = JSON.parse(oldDataJson);
    const oldTokenMap = new Map<string, AppToken>(
    oldTokenList.map(t => [t.token_address, t])
  );

  const updates: AppToken[] = [];

  //finding the changes in the new data and the old data 

  for (const newToken of newTokenList){
    const oldToken = oldTokenMap.get(newToken.token_address);

    if (oldToken){

        const newPrice = parseFloat(newToken.price_sol.toString());
        const oldPrice = parseFloat(oldToken.price_sol.toString());
        const newVolume = parseFloat(newToken.volume_sol.toString());
        const oldVolume = parseFloat(oldToken.volume_sol.toString());

        if (isNaN(newPrice) || isNaN(oldPrice)) continue;
        const priceDelta = Math.abs(newPrice - oldPrice);
        const volumeDelta = Math.abs(newVolume - oldVolume);

        if(priceDelta > PRICE_THRESHOLD || volumeDelta > VOLUME_THRESHOLD){
            updates.push({
                token_address: newToken.token_address,
                price_sol: newToken.price_sol,
                volume_sol: newToken.volume_sol,
                price_1hr_change: newToken.price_1hr_change,
              } as AppToken);//only update the changes 
        }
    }
  }

  await redisClient.set(cacheKey, JSON.stringify(newTokenList), 'EX', 90);//if not changes we just save the fresh data

  //show changes via websocket
  if (updates.length > 0) {
    console.log(` WebSocket Emit: Pushing ${updates.length} live updates.`);
    // 'liveUpdate' is the event name the frontend will listen for
    io.emit('liveUpdate', { updates: updates });
  }
  }