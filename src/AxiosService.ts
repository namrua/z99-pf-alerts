import axios from "axios";
import { redisPub } from "./RedisService";
const API_TOKEN = 'b4d0a58c40fc6d0040d5596536a913f4e99ad141cc454b5d6c41f4d28c36078c';
const DATASET_ID = 'gd_lwxkxvnf1cynvib9co';
const WEBHOOK_URL = 'https://api.feryonsolana.com/webhook';
import https from 'https';
const axiosInstance = axios.create({
  timeout: 10000,
});

const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Bỏ qua xác thực SSL
});

export default class AxiosService {
  public static getOfficialLinks = async (url: string) => {
    try {
      const response = await axiosInstance.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });
      if (!response?.data?.twitter) {
        return '';
      }
      return response?.data?.twitter;
    } catch (error) {
      // console.error('fetch official links error:', error);
      return '';
    }
  }

  static async scrapeTwitterContent(url: string): Promise<boolean> {
    const apiUrl = `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${DATASET_ID}&endpoint=${WEBHOOK_URL}&format=json&uncompressed_webhook=true&include_errors=true`;

    try {
      const response = await axios.post(
        apiUrl,
        [{ url: url }],
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        console.log('Scrape Success:', response.data);
        return true;
      } else {
        console.error('Unexpected Response:', response.status, response.data);
        return false;
      }
    } catch (error) {
      console.error('Error When Scrape:', error);
      return false;
    }
  }

  // static async getSnapshotData(
  //   snapshotId: string, url: string
  // ): Promise<any> {
  //   if (snapshotId) {
  //     const apiUrl = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`;

  //     try {
  //       console.log('Fetching snapshot data:', snapshotId);
  //       const response = await axios.get(apiUrl, {
  //         headers: {
  //           Authorization: `Bearer ${API_TOKEN}`
  //         }
  //       });

  //       if (response.status === 200 && response.data) {
  //         console.log('Snapshot Data:', response.data);
  //         return response.data;
  //       } else {
  //         console.error('Unexpected Response:', response.status, response.data);
  //       }
  //     } catch (error) {
  //       if (axios.isAxiosError(error)) {
  //         console.error('Error Response:', error.response?.data || error.message);
  //       } else {
  //         console.error('Unexpected Error:', error);
  //       }
  //     }
  //   }
  // }

  public static sendSignalToOther = async (data: any) => {
    try {
      const response = await axios.post<any>('https://144.126.146.156:443/api/webhook', data, { httpsAgent });
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error:', error.message);
      } else {
        console.error('Unexpected error:', error);
      }
      throw error;
    }
  };

  public static async getTopHolder(mintId: string): Promise<any> {
    try {
      const cacheKey = `mevx:topHolder:${mintId}`;
      const cachedData = await redisPub.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      const url = `https://api-prod.mevx.io/trade/top/holders?tokenAddress=${mintId}&limit=20`;
      const response = await axiosInstance.get(url);
      if (response.status === 200 && response.data) {
        redisPub.set(cacheKey, JSON.stringify(response.data), "EX", 60);
        return response.data;
      }
    } catch (error) {
      console.error("Error fetching top holder data:", error);
    }
  }

  public static async getBotInfo(mintId: string): Promise<any> {
    try {
      const url = `https://api.solmarketmaker.com/info/${mintId}`;
      const response = await axiosInstance.get(url);
      if (response.status === 200 && response.data) {
        return response.data[0];
      }
    } catch (error) {
      console.error("Error fetching bot data:", error);
    }
  }
}