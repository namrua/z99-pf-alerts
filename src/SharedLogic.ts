import { RedisTokenCached, TokenReachMCapResponse, TopHolder } from "./ReponseModel";
import TelegramMessageBuilder from "./TelegramMessageBuilder";
import TelegramMessageSender from "./TelegramMessageSender";
import Utils from "./Utils";
import { ClickHouseService } from "./ClickHouseService";
import { DeployerHistory, TopHolderDetails, UserFirstBuyInfo, UserRole } from "./DatabaseReponseModel";
import { ClickHouseQuery } from "./Queries";
import { redisPub, TOKEN_TTL_SECONDS } from "./RedisService";
import { OnchainDataService } from "./OnchainDataService";
import MevxService from "./MevxService";
import { DexscreenerData, MevxTopHolder } from "./ExternalApiResponse";
import Handle from "./Handle";
import DexscreenerService from "./DexscreenerService";

//namzua
// const groupId = -1002255160929;

export const subscribeEvent = async (): Promise<void> => {
  let kafkaService = new Handle();
  kafkaService.fetchData();
  kafkaService.startIntervalJob();
};

export const handleReachMCap = async (filteredUniqueRequests: any[], mintsProcessing: string[], reachMcap: string, groupId: number) => {
  const pipeline = redisPub.pipeline();
  if (filteredUniqueRequests && filteredUniqueRequests.length > 0) {
    filteredUniqueRequests.forEach((el) => {
      pipeline.exists(`${reachMcap}_${el.token}`);
    });
    const results = await pipeline.exec();
    if (results) {
      results.forEach(async (result, index) => {
        const [err, exists] = result;
        if (err) {
          console.error("Redis pipeline error:", err);
          return;
        }
        const currentToken = filteredUniqueRequests[index];
        if (currentToken && !exists) {
          const mintId = currentToken?.token;
          const isMintProcessing = mintsProcessing.includes(mintId);
          if (!isMintProcessing) {
            mintsProcessing.push(mintId);
            await sendNotification(mintId, currentToken?.price_in_usd, reachMcap, groupId);
            mintsProcessing = mintsProcessing.filter(mint => mint !== mintId);
          }
        }
      });
    }
  }
};

export const sendNotification = async (mintId: string, currentPriceInUsd: any, reachMcap: string, groupId: number, isDisableCache?: boolean) => {
  try {
    let mevxTokenMetadata = await MevxService.getMetaData(mintId, isDisableCache);
    const pairId = mevxTokenMetadata?.pairAddress;
    const decimals = mevxTokenMetadata?.tokenDecimal;
    const totalSupply = mevxTokenMetadata?.totalSupply;
    const deployerId = mevxTokenMetadata?.owner;
    if (mevxTokenMetadata && mevxTokenMetadata.tokenPrice > 0) {
      const [topHolder, deployerHolding, top20FirstBuyer] = await Promise.all([
        MevxService.getTopHolder(mintId),
        OnchainDataService.getTokenAccountBalance(deployerId, mintId),
        ClickHouseService.queryMany<UserFirstBuyInfo>(ClickHouseQuery.GET_TOP_70_FIRST_BUYER, { mintId, deployerId: deployerId }),
      ]) as unknown as [MevxTopHolder, number, UserFirstBuyInfo[]];

      const excludedHolders = [pairId, '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi'];
      const topHolderFiltered: TopHolder = processTopHolder(topHolder, excludedHolders, decimals, totalSupply);
      const top10HolderIds = topHolderFiltered.detailTop10.map((el: { address: string }) => el.address);
      const top20HolderIds = topHolder.holders?.filter((item) => !excludedHolders.includes(item.wallet)).slice(0, 20).map((el: { wallet: string }) => el.wallet);
      const topHolderDetailsQuery = buildeGetTopHolderDetailsQuery(top10HolderIds, mintId);
      const userTradedQuery = buildTradedUserQuery(top20HolderIds);

      const [directFreshWallets, userTradedDB, dexInfo, userRoles, deployerHistory, topHolderDetails] = await Promise.all([
        getFreshWallets(top20HolderIds, pairId),
        ClickHouseService.queryMany<any>(userTradedQuery, {}),
        DexscreenerService.getDexscreenerData(mintId),
        ClickHouseService.queryMany<UserRole>(ClickHouseQuery.COUNT_USER_ROLES, { mintId }),
        ClickHouseService.query<DeployerHistory>(ClickHouseQuery.GET_DEPLOYER_HISTORY, { mintId }),
        ClickHouseService.queryMany<TopHolderDetails>(topHolderDetailsQuery, {}),
      ]) as unknown as [any[], any[], DexscreenerData, UserRole[], DeployerHistory, TopHolderDetails[]];

      const userTraded = userTradedDB?.map(el => el.userId);
      const userNotTradedYet = top20HolderIds.filter(item => !userTraded?.includes(item));
      const userNotTradedYetMapped = userNotTradedYet.map(id => ({ userId: id }));
      const totalFreshWallets = directFreshWallets.concat(userNotTradedYetMapped);

      topHolderFiltered.detailTop10 = topHolderFiltered.detailTop10.map(holder => {
        const holderDetail = topHolderDetails.find(detail => detail.userId === holder.address);
        return {
          ...holder,
          remaining: (holder?.remaining ?? 0),
          entryPrice: ((holderDetail?.entryPrice ?? 0) * mevxTokenMetadata.totalSupply) || 0,
          totalBuy: holderDetail?.totalBuy || 0,
          totalSell: holderDetail?.totalSell || 0,
        };
      });

      const result: TokenReachMCapResponse = {
        name: mevxTokenMetadata.name,
        symbol: mevxTokenMetadata.symbol,
        mintId: mintId,
        createdDate: mevxTokenMetadata.createTime,
        burnPercent: mevxTokenMetadata.burnPercent,
        officialLinks: {
          telegram: mevxTokenMetadata.urlInfo?.telegram,
          twitter: mevxTokenMetadata.urlInfo?.twitter,
          website: mevxTokenMetadata.urlInfo?.website,
          discord: mevxTokenMetadata.urlInfo?.discord,
        },
        mCap: currentPriceInUsd ? Utils.roundDecimals(currentPriceInUsd * totalSupply, 2) : Utils.roundDecimals((mevxTokenMetadata.tokenPriceUsd) * totalSupply, 2),
        security: {
          insiders: userRoles.find(role => role.userType === 'insider')?.userCount || 0,
          kols: userRoles.find(role => role.userType === 'kol')?.userCount || 0,
          dexPaid: dexInfo?.dexPaid,
          cto: dexInfo?.cto,
          made: deployerHistory.made
        },
        th: topHolderFiltered,
        devSold: {
          holdingPercent: Utils.roundDecimals((deployerHolding / totalSupply) * 100, 2)
        },
        topBuyers: top20FirstBuyer?.map((buyer: UserFirstBuyInfo) => ({
          tradeType: buyer.tradeType,
          status: caculateStatusTopBuyer(buyer.totalBuy, buyer.totalSell, totalSupply),
          buyPercent: Utils.roundDecimals(((buyer.totalBuy * 100) / totalSupply), 2),
          sellPercent: Utils.roundDecimals(((buyer.totalSell * 100) / totalSupply), 2),
          totalSolBought: buyer.totalSolBought
        })),
        freshies: `${totalFreshWallets.length}/20`,
      }
      const currentTokenPriceInSol = mevxTokenMetadata.tokenPriceUsd / mevxTokenMetadata.solPrice;
      const messageReplyId = await sendTelegramMessage(result, groupId);
      if (messageReplyId) {
        const redisTokenCached: RedisTokenCached = {
          mintId: mintId,
          originalPrice: currentTokenPriceInSol,
          updatedPrice: currentTokenPriceInSol,
          createdDate: Math.floor(Date.now() / 1000),
          messsageToReplyId: messageReplyId
        }
        redisPub.setex(`${reachMcap}_${mintId}`, TOKEN_TTL_SECONDS, JSON.stringify(redisTokenCached));
      }

      return messageReplyId;
    }
    else {
      if (!mevxTokenMetadata) {
        console.log("mevxTokenMetadata is null");
      }
    }

  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

const sendTelegramMessage = async (result: TokenReachMCapResponse, groupId: number) => {
  try {
    const res = TelegramMessageBuilder.buildTokenReachMCap(result);
    const messageReplyId = await TelegramMessageSender.sendMessage(groupId, res.message, res.keyboard);
    try {
    } catch (error) {
      console.log("Error sending autobuying signals: ", error);
    }
    return messageReplyId;
  }
  catch (error) {
    console.log("Error sending telegram message: ", error);
  }
}


const processTopHolder = (data: MevxTopHolder, excludeValues: string[], decimals: number, totalSupply: number) => {
  try {
    if (!data || typeof data !== "object") {
      return {
        count: 0,
        totalTop10: 0,
        detailTop10: [],
      };
    }
    const filteredData = data.holders?.filter((item) => !excludeValues.includes(item.wallet));

    const top10 = filteredData.slice(0, 10);
    const sumOfTop10 = top10.reduce((sum, { amount }) => sum + Number(amount), 0);
    const totalTop10InPercent = parseFloat(((sumOfTop10 / totalSupply) * 100).toFixed(1));

    const top10InPercent = top10.map(el => ({
      address: el.wallet,
      percent: Number.isFinite(totalTop10InPercent) ? parseFloat(((Number(el.amount) / totalSupply) * 100).toFixed(1)) : 0,
      remaining: Number(el.amount)
    }));
    const result: TopHolder = {
      count: data.totalSize,
      totalTop10: Number.isFinite(totalTop10InPercent) ? totalTop10InPercent : 0,
      detailTop10: top10InPercent,
    }
    return result;
  } catch (error) {
    console.error("Error in processTopHolder", error);
    return {
      count: 0, totalTop10: 0, detailTop10: []
    }
  }
}

const caculateStatusTopBuyer = (buy: number, sell: number, totalSupply: number) => {
  const buyNumber = typeof buy === 'string' ? parseInt(buy) : buy;
  const sellNumber = typeof sell === 'string' ? parseInt(sell) : sell;

  const diff = buyNumber - sellNumber;
  const result = diff === 0 || diff / totalSupply < 0.0001 ? 2 : sellNumber === 0 ? 0 : 1;
  return result;
}

const buildFreshWalletQuery = (userIds: string[]): string => {
  const userArray = userIds.map(id => `'${id}'`).join(', ');
  const query = `
    WITH 
    user_list AS (
        SELECT arrayJoin([
           ${userArray}
        ]) AS userId
    )
SELECT 
    DISTINCT fw.userId AS userId
FROM FreshWallet fw
WHERE fw.userId IN (SELECT userId from user_list)`;

  return query;
}

export const buildGetDeployerIdsQuery = (mintIds: string[]): any => {
  const query = `select ti.mintId, ti.deployerId from TokenInfo ti 
where ti.mintId in (${mintIds.map(id => `'${id}'`).join(', ')})`;
  return query;
}

const buildTradedUserQuery = (userIds: string[]): string => {
  const query = `SELECT DISTINCT tu.userId as userId FROM TradedUser tu
  WHERE userId IN (${userIds.map(id => `'${id}'`).join(', ')})`;
  return query;
}

const getFreshWallets = async (topHolderIds: string[], pairId: string): Promise<any[]> => {
  try {
    const freshWalletQuery = buildFreshWalletQuery(topHolderIds);
    const result = await ClickHouseService.queryMany<any>(freshWalletQuery, {});
    return result || [];
  } catch (error) {
    console.error("Error in when get fresh wallet db", error);
    return [];
  }
}

const buildeGetTopHolderDetailsQuery = (userIds: string[], mintId: string): string => {
  const query = `SELECT 
  userId,
  SUM(CASE WHEN isBuy = 1 THEN tokenPrice * tokenAmount ELSE 0 END) / 
  NULLIF(SUM(CASE WHEN isBuy = 1 THEN tokenAmount ELSE 0 END), 0) AS entryPrice,
  SUM(CASE WHEN isBuy = 1 THEN tokenAmount ELSE 0 END) AS totalBuy,
  SUM(CASE WHEN isBuy = 0 THEN tokenAmount ELSE 0 END) AS totalSell
  FROM Trading
  WHERE mintId = '${mintId}'
  AND userId IN (${userIds.map(id => `'${id}'`).join(', ')}) GROUP BY userId`;
  return query;
}