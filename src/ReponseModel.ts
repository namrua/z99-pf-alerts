export interface TwitterAlertReponseModel {
    tokenInfo: TokenInfo;
    twitterContent: TwitterContent;
}

export interface TokenInfo {
    mintId: string;
    name: string;
    symbol: string;
    marketCap: number;
    devBuy: number;
    devSold: number;
    th?: TopHolder;
}

export interface TwitterContent {
    user: string;
    name: string;
    description: string;
    createdDate: string;
    url: string;
    photos: string[];
    replies: number;
    reposts: number;
    likes: number;
    followers: number;
    views: number;
}

export interface TokenReachMCapResponse {
    name: string;
    symbol: string;
    deployerId?: string;
    mintId: string;
    createdDate: number;
    officialLinks: OfficialLink;
    mCap: number;
    th?: TopHolder;
    security: {
        insiders: number;
        kols: number;
        dexPaid?: boolean;
        cto?: boolean;
        made: number;
    };
    devSold: {
        holdingPercent: number;
    };
    burnPercent: number;
    topBuyers?: TopBuyer[];
    freshies?: string;
}

export interface TokenUpdateResponse {
    mintId: string;
    replyId: number;
    createdDate: number;
    gain: number;
    originalCap: number;
    currentCap: number;
}

export interface TopHolder {
    count: number;
    totalTop10: number;
    detailTop10: HolderDetails[];
}
export interface HolderDetails {
    address: string;
    percent: number;
    entryPrice?: number;
    totalBuy?: number;
    totalSell?: number;
    remaining?: number;
}
export interface TopBuyer {
    tradeType: number;
    status: number;
    buyPercent: number;
    sellPercent: number;
    totalSolBought: number;
}

export interface FreshWallets {
    userNotTradedYet: string[];
    directFreshWallets: string[];
}

export interface RedisTokenCached {
    mintId: string;
    originalPrice: number;
    updatedPrice: number;
    createdDate: number;
    messsageToReplyId?: number;
}

export interface OfficialLink {
    website?: string;
    telegram?: string;
    twitter?: string;
    discord?: string;
}