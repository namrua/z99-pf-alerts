import axios from "axios";
import { DexscreenerData } from "./ExternalApiResponse";
import { redisPub } from "./RedisService";

export default class DexscreenerService {
    public static async getDexscreenerData(mintId: string): Promise<DexscreenerData> {
        const cachedKey = `dexscreener:${mintId}`;
        const cachedData = await redisPub.get(cachedKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        const url = `https://api.dexscreener.com/orders/v1/solana/${mintId}`;
        const response = await axios.get(url);
        const tokenProfile = response.data.filter((x: any) => x.type === "tokenProfile" && x.status === "approved").length > 0;
        const cto = response.data.filter((x: any) => x.type === "communityTakeover" && x.status === "approved").length > 0;
        const result: DexscreenerData = {
            dexPaid: tokenProfile,
            cto: cto
        }
        const expiration = (tokenProfile && cto) ? 60 : 3600;
        redisPub.set(cachedKey, JSON.stringify(result), 'EX', expiration);
        return result;
    }
}