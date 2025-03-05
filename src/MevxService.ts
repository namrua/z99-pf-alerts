import axios from "axios";
import { redisPub } from "./RedisService";
import { MevxTokenMetaData } from "./ExternalApiResponse";
const axiosInstance = axios.create({
    timeout: 10000,
});
export default class MevxService {
    public static async getTopHolder(mintId: string): Promise<any> {
        try {
            const cacheKey = `mevx:topHolder:${mintId}`;
            const cachedData = await redisPub.get(cacheKey);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
            const url = `https://api.mevx.io/api/v1/holders?chain=sol&token=${mintId}&limit=100&orderBy=amount%20desc`;
            const response = await axiosInstance.get(url, {
                headers:
                    { 'Referer': 'https://mevx.io/' }
            });
            if (response.status === 200 && response.data) {
                redisPub.set(cacheKey, JSON.stringify(response.data), "EX", 60);
                return response.data;
            }
        } catch (error) {
            console.error("Error fetching top holder data:", error);
        }
    }

    public static async getMetaData(mintId: string, isCachedDisable?: boolean): Promise<MevxTokenMetaData> {
        try {
            const cacheKey = `mevx:metaData:${mintId}`;
            if (!isCachedDisable) {
                const cachedData = await redisPub.get(cacheKey);
                if (cachedData) {
                    return JSON.parse(cachedData);
                }
            }
            const url = `https://api-fe.mevx.io/api/token/metadata/sol/${mintId}`;
            const response = await axiosInstance.get(url, {
                headers:
                    { 'Referer': 'https://mevx.io/' }
            });
            if (response.status === 200 && response.data) {
                const metaData =  response.data?.data as MevxTokenMetaData;
                if (metaData.createTime && metaData.createTime.toString().length > 10) {
                  metaData.createTime = Math.round(metaData.createTime / 1000);
                }
                if (metaData.startTime && metaData.startTime.toString().length > 10) {
                  metaData.startTime = Math.round(metaData.startTime / 1000);
                }
                redisPub.set(cacheKey, JSON.stringify(metaData), "EX", 86400);
                return metaData
            }
        } catch (error) {
            console.error("Error fetching mevx meta data:", error);
        }
        return {} as MevxTokenMetaData;
    }
}