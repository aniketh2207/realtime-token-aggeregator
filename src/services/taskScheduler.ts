import { schedule } from 'node-cron';
import { fetchAndMergeData } from './dataFetcher.js';
import redisClient from './cache.js'
import { Server as SocketIOServer } from 'socket.io'; 
import { compareAndUpdateCache } from './dataComparer.js'; 

export const TOKEN_CACHE_KEY = 'tokens:all';
let ioInstance: SocketIOServer | undefined;


async function runUpdateTask(){
    if (!ioInstance) {
        console.error(" Socket.io instance not set. Cannot run cron job.");
        return;
      }
    console.log('Cron job starting: Fetching Token data....');

    try{
        const tokenList = await fetchAndMergeData();
        if (tokenList.length>0){
            //save the data to the redis server as cache;
            await compareAndUpdateCache(tokenList, redisClient, ioInstance);
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
export function startTaskScheduler(io: SocketIOServer){
    ioInstance = io;
    runUpdateTask();

    schedule('*/45 * * * * *', runUpdateTask);
    console.log('Task scheduler started, will run every 45 seconds');
}