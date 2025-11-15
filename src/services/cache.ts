import Redis from 'ioredis';

const redisClient = new Redis({
    maxRetriesPerRequest: null,
});

redisClient.on('connect',() =>{
    console.log('Successfully connected to redis server');
});

redisClient.on('error',(err) => {
 console.log('Could not connect to redis server: ', err);
});

export default redisClient;