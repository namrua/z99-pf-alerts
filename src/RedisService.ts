import Redis from "ioredis";

const redisConfig = {
    port: 6379,
    host: "52.76.168.72",
    password: "yz4Tf8-MoH1vU0QT7CMeH1uw3BqIV6d14hBn2zqL8R4v9ZPf",
};

export const redisPub = new Redis(redisConfig);
export const TOKEN_TTL_SECONDS = 60 * 24 * 60 * 60;