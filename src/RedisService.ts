import Redis from "ioredis";

const redisConfig = {
    port: 6379,
    host: "52.76.168.72",
    password: "yz4Tf8-MoH1vU0QT7CMeH1uw3BqIV6d14hBn2zqL8R4v9ZPf",
};

const datfakeRedis = {
    host: '52.74.127.103',
    port: 6379,
    password: 'i34QozSNxYGh85LnSiaB2uweHq04B6xNBnEAzWHzi-f17MLM'
};

export const redisPub = new Redis(redisConfig);
export const redisSub = new Redis(redisConfig);
export const datFakeRedisPub = new Redis(datfakeRedis);
export const TOKEN_TTL_SECONDS = 60 * 24 * 60 * 60;