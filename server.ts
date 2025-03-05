import express, { Application, Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { subscribeEvent } from "./src/SharedLogic";
import { redisPub } from "./src/RedisService";
import { OnchainDataService } from "./src/OnchainDataService";

const app: Application = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 4670;
export let solPrice: number = 0;
app.use(cors());
app.use(bodyParser.json());
app.get("/", (req, res) => {
    res.send("Hello World");
});

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server is running on port ${PORT}`);
    subscribeEvent();
});

export const getSolPrice = async (): Promise<number> => {
    let solPrice: number = 0;
    let cachedSolPrice = await redisPub.get("pf_aio_solPrice");
    if (cachedSolPrice) {
        solPrice = parseFloat(cachedSolPrice);
    }
    else {
        const response = await OnchainDataService.fetchPriceData();
        if (response) {
            solPrice = Number(response);
            await redisPub.set("pf_aio_solPrice", solPrice.toString());
        }
    }
    return solPrice;
}