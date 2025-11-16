import { fetchAndMergeData } from './dataFetcher.js';
import redisClient from './cache.js'
import { Server as SocketIOServer } from 'socket.io'; 
import { compareAndUpdateCache } from './dataComparer.js'; 

export const TOKEN_CACHE_KEY = 'tokens:all';
let ioInstance: SocketIOServer | undefined;
let intervalId: NodeJS.Timeout | undefined;
const INTERVAL_MS = 30 * 1000; // 30 seconds

async function runUpdateTask(){
    if (!ioInstance) {
        console.error(" Socket.io instance not set. Cannot run task.");
        return;
      }

    console.log('Task starting: Fetching Token data....');

    try{
        const tokenList = await fetchAndMergeData();
        if (tokenList.length>0){
            //save the data to the redis server as cache;
            await compareAndUpdateCache(tokenList, redisClient, ioInstance);
        }
        else{
            console.log('Task failed, tokenList was not updated to the redis server');
        }
    }
    catch(error){
        console.error('Task error: ', error);
    }
}

async function scheduleNextRun() {
    if (!ioInstance) return;
    
    await runUpdateTask();
    
    // Schedule next run after current task completes
    intervalId = setTimeout(() => {
        scheduleNextRun();
    }, INTERVAL_MS);
}

// initialising the scheduler
export function startTaskScheduler(io: SocketIOServer){
    ioInstance = io;
    
    // Run immediately, then schedule subsequent runs
    scheduleNextRun();
    console.log('Task scheduler started, will run every 30 seconds');
}

// Optional: Add a cleanup function to stop the scheduler
export function stopTaskScheduler() {
    if (intervalId) {
        clearTimeout(intervalId);
        intervalId = undefined;
    }
}