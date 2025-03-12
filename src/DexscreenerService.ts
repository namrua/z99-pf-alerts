import axios from "axios";
import { DexscreenerSecurity, DexscreenerUpdatedData } from "./ExternalApiResponse";
import { redisPub } from "./RedisService";

export default class DexscreenerService {
    public static async getDexscreenerData(mintId: string, isDisableCache?: boolean): Promise<DexscreenerSecurity> {
        const cachedKey = `dexscreener:${mintId}`;
        if (!isDisableCache) {
            const cachedData = await redisPub.get(cachedKey);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
        }
        const url = `https://api.dexscreener.com/orders/v1/solana/${mintId}`;
        const response = await axios.get(url);
        const tokenProfile = response.data.filter((x: any) => x.type === "tokenProfile" && x.status === "approved").length > 0;
        const cto = response.data.filter((x: any) => x.type === "communityTakeover" && x.status === "approved").length > 0;
        const result: DexscreenerSecurity = {
            dexPaid: tokenProfile,
            cto: cto
        }
        const expiration = (tokenProfile && cto) ? 60 : 3600;
        redisPub.set(cachedKey, JSON.stringify(result), 'EX', expiration);
        return result;
    }

    public static async getLastestFromDexscreener(): Promise<DexscreenerUpdatedData[] | undefined> {
        try {
            const url = `https://api.dexscreener.com/token-profiles/latest/v1`;
            const response = await axios.get(url);
            if (response.status === 200 && response.data) {
                const data = response.data as DexscreenerUpdatedData[];
                return data;
            }
        } catch (error) {
            console.error("Error fetching lastest dexscreener data:", error);
        }
    }
}