import axios from "axios";
import { redisPub } from "./RedisService";
import { WallentBalance } from "./ExternalApiResponse";
const url = `https://mainnet.helius-rpc.com/?api-key=73dd9e26-6e43-4ed9-80a4-629028871c0b`;
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";

interface Params {
    limit: number;
    mint: string;
    cursor?: any;
}
export class OnchainDataService {
    static getTokenHolders = async (mint: string) => {
        let cursor;
        let allOwners: Set<any> = new Set();
        while (true) {

            let params: Params = {
                limit: 1000,
                mint
            };

            if (cursor != undefined) {
                params.cursor = cursor;
            }

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: "helius-test",
                    method: "getTokenAccounts",
                    params: params,
                }),
            });

            const data = await response.json();

            if (!data.result || data.result.token_accounts.length === 0) {
                break;
            }

            data.result.token_accounts.forEach((account: any) => {
                allOwners.add(account);
            });

            cursor = data.result.cursor;
        }

        let resp = Array.from(allOwners);
        return resp;

    }

    static getTokenSupply = async (mint: string) => {
        const cachedResult = await redisPub.get(`tokenSupply:${mint}`);
        if (cachedResult) {
            return JSON.parse(cachedResult);
        }
        let params: string[] = [
            mint
        ];

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: "1",
                method: "getTokenSupply",
                params: params,
            }),
        });

        const data = await response.json();
        redisPub.set(`tokenSupply:${mint}`, JSON.stringify(data.result?.value), 'EX', 60);
        return data.result?.value;
    }

    static getHolderDetailsOnJub = async (userId: string): Promise<WallentBalance[]> => {
        const url = `https://worker.jup.ag/portfolio/${userId}`;

        try {
            const response = await axios.get(url);
            return response.data?.walletBalance?.balances;
        } catch (error) {
            console.error('fetch holder detail failed', error);
        }
        return [];
    }

    static fetchPriceData = async (): Promise<string> => {
        const url = 'https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112';

        try {
            const response = await axios.get(url);
            const priceData = response.data?.data?.So11111111111111111111111111111111111111112?.price;
            return priceData ? priceData.toString() : '0';
        } catch (error) {
            console.error('fetch sol price error:', error);
            return '0';
        }
    }

    static async getTokenAccountBalance(owner: string, mint: string) {
        try {
            const cachedKey = `tokenAccountBalance:${owner}:${mint}`;
            const cachedData = await redisPub.get(cachedKey);
            if (cachedData) {
                return +cachedData;
            }
            const ata = this.getATAAddress(new PublicKey(owner), new PublicKey(mint));
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "getTokenAccountBalance",
                    params: [ata.toBase58()]
                })
            });
            const data = await response.json();
            if (data.error) {
                redisPub.set(cachedKey, '0', 'EX', 60);
                return 0;
            }
            redisPub.set(cachedKey, data.result.value.uiAmount, 'EX', 60);
            return +data.result.value.uiAmount;
        } catch (error) {
            console.error('get token account error:', error);
        }
    }

    private static getATAAddress(owner: PublicKey, mint: PublicKey) {
        const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
        const [publicKey] = PublicKey.findProgramAddressSync(
            [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
        );
        return publicKey;
    }

    static async getParsedTokenAccountsByOwner(ownerAddress: string) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getTokenAccountsByOwner",
                    "params": [
                        ownerAddress,
                        {
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                        },
                        {
                            "encoding": "jsonParsed"
                        }
                    ]
                }),
            });
            const data = await response.json();
            return data.result.value.map((accountInfo: any) => ({
                mint: accountInfo.account.data["parsed"]["info"]["mint"],
                owner: accountInfo.account.data["parsed"]["info"]["owner"],
                decimals: accountInfo.account.data["parsed"]["info"]["tokenAmount"]["decimals"],
                amount: accountInfo.account.data["parsed"]["info"]["tokenAmount"]["amount"],
            }));
            
        } catch (error) {
            console.error("Error fetching token accounts:", error);
            throw error;
        }
    }
};
