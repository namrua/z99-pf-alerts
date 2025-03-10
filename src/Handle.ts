import { Kafka, logLevel } from "kafkajs";
import { datFakeRedisPub, redisPub, TOKEN_TTL_SECONDS } from "./RedisService";
import { buildGetDeployerIdsQuery, handleReachMCap, sendNotification } from "./SharedLogic";
import { Constant } from "./Constant";
import { Program, AnchorProvider, Wallet } from "@project-serum/anchor";
import { PublicKey, Connection, Keypair, Commitment } from "@solana/web3.js";
import IDL from "./idl.json";
import { ClickHouseService } from "./ClickHouseService";
import { DeployerInfo } from "./DatabaseReponseModel";
import { OnchainDataService } from "./OnchainDataService";

//const kafkaBroker = "49.12.174.250:9092";
//kafka prod
const kafkaBroker = "64.130.50.149:9092";
const tradeTopic = "sol-tx";
const processingMint15k: string[] = [];
const groupId15k = -1002367157410;
const processingMint30k: string[] = [];
const groupId30k = -1002289275186;
const processingMint45k: string[] = [];
const groupId45k = -1002356898871;
const processingKOTH: string[] = [];
const groupIdKOTH = -1002185859518;
const groupIdTokenBonded = -1002337411158;
const groupIdDevSold = -1002220601309;
let processingMintDevSold: string[] = [];

var mCapAlertBuffer: any[] = [];
var devSoldAlertBuffer: any[] = [];


const keyPair = Keypair.generate();
const launchpadProgramId = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const rpc = "https://mainnet.helius-rpc.com/?api-key=7d90291b-9771-4657-b15c-f4d86d3c0a48";

class Handle {
    kafka: Kafka;

    constructor() {
        this.kafka = new Kafka({
            clientId: "my-app",
            brokers: [kafkaBroker],
            logLevel: logLevel.ERROR,
        });
    }

    async startIntervalJob() {
        setInterval(async () => {
            await this.handleMCapAlert();
        }, 2000);
        // setInterval(async () => {
        //     await this.handleDevSoldAlert();
        // }, 5000);
    }

    async fetchData() {
        console.log('Fetching data from Kafka...');
        const tradingConsumere = this.kafka.consumer({ groupId: `sol-tx-z99-pf-alert` });
        await tradingConsumere.connect();

        await tradingConsumere.subscribe({ topic: tradeTopic, fromBeginning: false });

        await tradingConsumere.run({
            eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
                console.log('Received trading batch:', batch.messages.length);
                try {
                    const parsedMessages: any[] = [];

                    for (const message of batch.messages) {
                        const messageValue = message.value?.toString();
                        if (messageValue) {
                            try {
                                const parsedMessage = JSON.parse(messageValue);
                                parsedMessage.offsetNumber = message.offset;
                                parsedMessages.push(parsedMessage);
                            } catch (error) {
                                console.error('Error parsing message:', error);
                            }
                        } else {
                            console.log('Received empty message');
                        }
                        resolveOffset(message.offset);
                    }
                    if (parsedMessages.length > 0) {
                        mCapAlertBuffer = mCapAlertBuffer.concat(parsedMessages);
                        // devSoldAlertBuffer = devSoldAlertBuffer.concat(parsedMessages);
                    }

                    await commitOffsetsIfNecessary();
                    await heartbeat();
                } catch (error) {
                    console.error('Error processing trading batch:', error);
                }
            },
        });


        const connection = new Connection(rpc, {
            wsEndpoint: rpc.replace("https", "wss"),
            commitment: "confirmed" as Commitment,
        });

        const provider = new AnchorProvider(
            connection,
            new Wallet(keyPair),
            AnchorProvider.defaultOptions()
        );

        const program = new Program(IDL as any, launchpadProgramId, provider);
        program.addEventListener("CompleteEvent", this.onCompleteEvent);
    }

    async handleMCapAlert() {
        try {
            const tradingRequests = mCapAlertBuffer;
            mCapAlertBuffer = [];
            const filteredRequests15k = tradingRequests.filter(item => (item.exchange == "pump" && ["buy", "sell"].includes(item.trade_type))
                && item.price_in_usd > 0.000015 && item.price_in_usd < 0.00003);
            const filteredRequests30k = tradingRequests.filter(item => (item.exchange == "pump" && ["buy", "sell"].includes(item.trade_type))
                && item.price_in_usd > 0.00003 && item.price_in_usd < 0.000045);
            const filteredRequests45k = tradingRequests.filter(item => (item.exchange == "pump" && ["buy", "sell"].includes(item.trade_type))
                && item.price_in_usd > 0.000045 && item.price_in_usd < 0.0001);
            const filteredRequestsKOTH = tradingRequests.filter(item => (item.exchange == "pump" && ["buy", "sell"].includes(item.trade_type))
                && item.quote_amount / item.token_amount > 0.0000002 && item.price_in_usd < 0.0001);
            await Promise.all([
                filteredRequests15k && filteredRequests15k.length > 0 ? handleReachMCap(filteredRequests15k, processingMint15k, Constant.Z99_ALERT_15K, groupId15k) : null,
                filteredRequests30k && filteredRequests30k.length > 0 ? handleReachMCap(filteredRequests30k, processingMint30k, Constant.Z99_ALERT_30K, groupId30k) : null,
                filteredRequests45k && filteredRequests45k.length > 0 ? handleReachMCap(filteredRequests45k, processingMint45k, Constant.Z99_ALERT_45K, groupId45k) : null,
                filteredRequestsKOTH && filteredRequestsKOTH.length > 0 ? handleReachMCap(filteredRequestsKOTH, processingKOTH, Constant.Z99_ALERT_KOTH, groupIdKOTH) : null,
            ])
        } catch (error) {
            console.error('Error handling first alert:', error);
        }
    }

    async handleDevSoldAlert() {
        try {
            const tradingRequests = devSoldAlertBuffer;
            devSoldAlertBuffer = [];
            const devSoldRequest = tradingRequests.filter(item => item.exchange == "pump" && item.trade_type == "sell" && item.token_amount > 5000000 && item.price_in_usd > 0.000015);
            await this.handleDevSold(devSoldRequest);
        } catch (error) {
            console.error('Error handling first alert:', error);
        }
    }

    handleDevSold = async (tradingRequest: any[]) => {
        try {
            const listMintsDistinct = Array.from(new Set(tradingRequest.map(item => item.token)));
            if (listMintsDistinct.length === 0) return;
            const deployerIdsQuery = buildGetDeployerIdsQuery(listMintsDistinct);
            const deployersByMint = await ClickHouseService.queryMany<DeployerInfo>(deployerIdsQuery, {});
            if (deployersByMint) {
                const filteredRequests = tradingRequest.filter(item =>
                    deployersByMint.some(deployer => deployer.mintId === item.token && deployer.deployerId === item.wallet)
                );
                const devSoldRequest = filteredRequests.map(item => {
                    return {
                        mintId: item.token,
                        deployerId: item.wallet
                    }
                });
                if (devSoldRequest.length === 0) return;
                const devSoldCached = await redisPub.mget(devSoldRequest.map(item => `devSold_${item.mintId}`));
                const unsendRequest = devSoldRequest.filter((val, index) => devSoldCached[index] === null);
                for (let item of unsendRequest) {
                    const tokenBalance = await OnchainDataService.getTokenAccountBalance(item?.deployerId, item.mintId);
                    if (tokenBalance == 0) {
                        //send notification
                        const isMintProcessing = processingMintDevSold.includes(item.mintId);
                        if (!isMintProcessing) {
                            processingMintDevSold.push(item.mintId);
                            await sendNotification(item.mintId, null, Constant.Z99_ALERT_DEVSOLD, groupIdDevSold, true);
                            await redisPub.setex(`devSold_${item.mintId}`, TOKEN_TTL_SECONDS, item.mintId);
                            processingMintDevSold = processingMintDevSold.filter(mint => mint !== item.mintId);
                        }
                    }
                }
                // console.log("dev sold request: ", result);
            }
        } catch (error) {
            console.error("Error in handleDevSold", error);
        }
    };

    onCompleteEvent = async (data: any) => {
        const mintId = data.mint.toBase58();
        if (mintId) {
            try {
                await datFakeRedisPub.publish("token-bonded", mintId);
                console.log("publish token_bonded: ", mintId);
            } catch (error) {
                console.log("fail when publish token_bonded ", mintId);
            }
            await sendNotification(mintId, null, Constant.Z99_ALERT_BONDED, groupIdTokenBonded, true);
        }
    }
}
export default Handle;
