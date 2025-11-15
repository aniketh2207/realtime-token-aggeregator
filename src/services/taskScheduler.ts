import { schedule } from 'node-cron';
import { fetchAndMergeData } from './dataFetcher.js';
import redisClient from './cache.js'

export const TOKEN_CACHE_KEY = 'tokens:all';

async function runUpdateTask(){
    console.log('Cron job starting: Fetching Token data....');

    try{
        const tokenList = await fetchAndMergeData();
        if (tokenList.length>0){
            //save the data to the redis server as cache;

            await redisClient.set(
                TOKEN_CACHE_KEY,            // The Key
                JSON.stringify(tokenList),      //the data must be a string
                'EX',           // Ex means Expired in 
                30              // time in seconds
            );
            console.log(`Cron job success: Saved ${tokenList.length} to the redis server as cache`);
        }
        else{
            console.log('Cron job failed, tokenList was not updated to the redis server');
        }
    }
    catch(error){
        console.error('Cron job error: ', error);
    }
}

// initialising the scheduler
export function startTaskScheduler(){

    runUpdateTask();

    schedule('*/20 * * * * *', runUpdateTask);
    console.log('Task scheduler started, will run every 20 seconds');
}