export interface ExtrasTokenInfo {
  name: string;
  deployerId: string;
  symbol: string;
  mintId: string;
  devBuy: number;
  currentMarketCap: number;
  decimals: number;
  totalSupply: number;
}

export interface TokenPair {
  mintId: string;
  pairId: string;
  type: string;
  blockNumber: number;
  initToken: number;
  totalSupply: number;
  initSol: number;
  createdDate: number;
  deployerId: string;
  symbol: string;
  name: string;
}

export interface TradingTokenInfo {
  mintId: string;
  pairId: string
  userId: string;
  deployerId: string;
  name: string;
  symbol: string;
  originalPlatformType: string;
  currentPlatformType: number;
  createdDate: number;
  solAmount: number;
  solPrice: number;
  tokenPrice: number;
  tokenAmount: number;
  poolToken: number;
  poolSol: number;
  pair: string;
  creationblockNumber?: number;
  officialLinks: string;
  totalSupply: number;
  decimals: number;
}

export interface UserFirstBuyInfo {
  tradeType: number;
  blockNumber: number;
  indexNumber: number;
  vpBlockNumber: number;
  totalBuy: number;
  totalQuoteBought: number;
  totalSell: number;
}

export interface FreshWalletsInfo {
  userId: string;
}

export interface UserRole {
  userType: string;
  userCount: number;
}
export interface DeployerHistory {
  made: number;
  best: number;
}

export interface CATH {
  athTokenPrice: number;
}

export interface TopHolderDetails {
  wallet: string;
  entryPrice: number;
  totalBuy: number;
  totalSell: number;
}

export interface TokenByDev {
  mintId: string;
  type: string;
}

export interface DeployerInfo {
  mintId: string;
  deployerId: string;
}