import Button from "./Button";
import { OfficialLink, TokenReachMCapResponse, TokenUpdateResponse, TopBuyer} from "./ReponseModel";
import Utils from "./Utils";

export default class TelegramMessageBuilder {
    public static buildTokenReachMCap(res: TokenReachMCapResponse): { message: string, keyboard: any } {
        let linkMessage = this.buildOfficialLinkMessage(res.officialLinks);
        let top10Details = '';
        if (res.th?.detailTop10) {
            {
                for (let index = 0; index < res.th?.detailTop10?.length; index++) {
                    const holderItem = res.th?.detailTop10[index];
                    const entryPriceDisplay = Utils.shortenNumber(holderItem.entryPrice) == "0" ? Utils.padStrings("-", 6) : Utils.padStrings(Utils.shortenNumber(holderItem.entryPrice) || "0", 6);
                    const totalBuyDisplay = Utils.shortenNumber(holderItem.totalBuy) == "0" ? Utils.padStrings("-", 6) : Utils.padStrings(Utils.shortenNumber(holderItem.totalBuy) || "0", 6);
                    const totalSellDisplay = Utils.shortenNumber(holderItem.totalSell) == "0" ? Utils.padStrings("-", 6) : Utils.padStrings(Utils.shortenNumber(holderItem.totalSell) || "0", 6);
                    const remainingDisplay = Utils.shortenNumber(holderItem.remaining) == "0" ? Utils.padStrings("-", 6) : Utils.padStrings(Utils.shortenNumber(holderItem.remaining) || "0", 6);

                    top10Details += `${Utils.padStrings(`${index + 1}${index < 9 ? '..' : '.'}${holderItem.address.slice(-4)}`, 6)} |${entryPriceDisplay} |${totalBuyDisplay}|${totalSellDisplay}|${remainingDisplay}\n`
                }
            }
        }
        let result = `<a href ="https://pump.fun/coin/${res.mintId}">${res.name} (${res.symbol})</a>
<code>${res.mintId}</code>\n
<code>MCap:</code> <b>${Utils.shortenNumber(res.mCap)}</b> | ⌛️ ${Utils.convertSecondToHumanTime((Date.now() / 1000) - res.createdDate)} | <a href ="https://x.com/search?f=live&q=(${res.symbol}%20OR%20${res.mintId}%20OR%20url:${res.mintId})&src=typed_query">Search on 𝕏</a>
<code>Dev: </code>${res.devSold.holdingPercent === 0 ? '✅ <b>(sold)</b>' : `❌ <b>(${res.devSold.holdingPercent}% left)</b>`}
 ├Made: <b>${res.security.made}</b> <a href="https://t.me/z99bot?start=dev_${res.mintId}">🔎</a>
 ${linkMessage ? '└Dex Paid:' : '└Dex Paid:'} ${res?.security.dexPaid ? '✅' : '❌'} | CTO: ${res?.security.cto ? '✅' : '❌'}
 ${linkMessage}<code>Buyers</code> 
 ├🐁Insiders: <b>${res?.security.insiders}</b>
 └🌟KOLs: <b>${res?.security.kols}</b>
<code>TH: </code><b>${Utils.shortenNumber(res.th?.count || 0)}</b> (total) | <code>Top 10:</code> <b>${res.th?.totalTop10}%</b> 
 ├${res.th?.detailTop10.map(th => `<a href="https://solscan.io/account/${th.address}">${th.percent}</a>`).join('|')}
 └<code>🌱Freshies:</code> <b>${res.freshies}</b>
<blockquote expandable><code><b>Top 10 in detail</b></code>
<code>${Utils.padStrings('User', 7)} |${Utils.padStrings('MCap', 6)} |${Utils.padStrings('Buy', 5)} |${Utils.padStrings('Sell', 5)} |${Utils.padStrings('Left', 5)}</code>
<code>${top10Details}</code>
</blockquote>\n`;
        if (res.topBuyers) {
            result += this.buildTopBuyersMessage(res.topBuyers);
        }
        result += `\n`;
        // result += this.getRefLink(res.mintId);
        // result += `<code>___________________________________________</code>\n`;
        result += this.getChartMessage(res.mintId);
        const buttons: Button[][] = [
            [{text: `🚀MevX(Web)`, url: `https://mevx.io/solana/${res.mintId}?ref=kdq9n2LcYEDa`},{ text: `⚡️MevX(Bot)`, url: `https://t.me/MevxTradingBot?start=${res.mintId}-kdq9n2LcYEDa` }],
            [{text: `Follow all alert channels`, url: `https://t.me/addlist/qJZX06_EaiQ0YmQ1`}]
        ];
        return { message: result, keyboard: this.buildKeyboard(buttons) };
    }
    private static buildKeyboard(buttons: Button[][]): any {
        return {
            inline_keyboard: buttons,
        };
    }

    private static buildTopBuyersMessage(topBuyers: TopBuyer[]): string {
        const countSniper = topBuyers.filter(buyer => buyer.tradeType === 1).length;
        const countBundle = topBuyers.filter(buyer => buyer.tradeType === 2).length;
        const totalBundleSolBought = topBuyers.filter(el => el.tradeType == 2).reduce((sum, el) => sum + el.totalSolBought, 0);
        const totalBundleSolBuyPercent = topBuyers.filter(el => el.tradeType == 2).reduce((sum, el) => sum + el.buyPercent, 0);
        const totalSniperSolBought = topBuyers.filter(el => el.tradeType == 1).reduce((sum, el) => sum + el.totalSolBought, 0);
        const totalSniperSolBuyPercent = topBuyers.filter(el => el.tradeType == 1).reduce((sum, el) => sum + el.buyPercent, 0);

        const top20FirstBuyers = topBuyers.slice(0, 20);
        const countHold = top20FirstBuyers.filter(buyer => buyer.status === 0).length;
        const countSoldPart = top20FirstBuyers.filter(buyer => buyer.status === 1).length;
        const countSoldOut = top20FirstBuyers.filter(buyer => buyer.status === 2).length

        const totalBuy = top20FirstBuyers.reduce((acc, buyer) => acc + buyer.buyPercent, 0);
        const totalSell = top20FirstBuyers.reduce((acc, buyer) => acc + buyer.sellPercent, 0);
         return `<code>Early</code>: 
 ├Sniper: ${countSniper} ${countSniper > 0 ? `<code>buy</code> ${Utils.roundDecimals(totalSniperSolBuyPercent, 1)}% <code>with</code> ${Utils.roundDecimals(totalSniperSolBought, 1)} SOL` : ''}
 ├Bundle: ${countBundle} ${countBundle > 0 ? `<code>buy</code> ${Utils.roundDecimals(totalBundleSolBuyPercent, 1)}% <code>with</code> ${Utils.roundDecimals(totalBundleSolBought, 1)} SOL` : ''}
 ├<code>Sum 🅑:</code>${Number(totalBuy.toFixed(1))}% | <code>Sum 🅢:</code> ${Number(totalSell.toFixed())}%
${this.buildTopBuyerStatus(top20FirstBuyers)} └🔴 Hold ${countHold} | 🟡 Sold part ${countSoldPart} | 🟢 Sold ${countSoldOut}\n`
    }

    private static buildTopBuyerStatus(topBuyers: TopBuyer[]): string {
        let resp = '';
        let chunkSize = 10;
        for (let i = 0; i < topBuyers.length; i += chunkSize) {
            resp += ' ├' + topBuyers.slice(i, i + chunkSize).map(buyer => buyer.status === 0 ? '🔴' : (buyer.status === 1 ? '🟡' : '🟢')).join('') + '\n';
        }
        return resp;
    }

    private static buildOfficialLinkMessage(officialLinks: OfficialLink): string {
        const links = [];
        if (officialLinks.website)
            links.push(`<a href="${officialLinks.website}">Web</a>`)
        if (officialLinks.telegram)
            links.push(`<a href="${officialLinks.telegram}">TG</a>`)
        if (officialLinks.twitter)
            links.push(`<a href="${officialLinks.twitter}">𝕏</a>`)
        if (links.length === 0)
            return '';
        return '└' + links.join(' | ') + '\n';
    }

    public static buildResponseUpdateMessage(res: TokenUpdateResponse): string {
        // let result = `🚀 <b>${(res.currentCap/res.originalCap).toFixed(1)}x</b> ${Utils.shortenNumber(res.originalCap)} to ${Utils.shortenNumber(res.currentCap)} | ⌛️ ${Utils.convertSecondToHumanTime((Date.now() / 1000) - res.createdDate)}`
        let result = `${Utils.getEmojiByGain(res.currentCap / res.originalCap)} <b>${(res.currentCap / res.originalCap).toFixed(1)}x</b> <code>|</code> 💹<code>From</code> <b>${Utils.shortenNumber(res.originalCap)}</b> ↗️ <b>${Utils.shortenNumber(res.currentCap)}</b> <code>within</code> <b>${Utils.convertSecondToHumanTime((Date.now() / 1000) - res.createdDate)}</b>`
        return result;
    }

    private static getRefLink(mintId: string): string {
        let result = '🤖 ';
        let msg = [];
        msg.push(`<a href="https://t.me/MevxTradingBot?start=${mintId}-zHU2qV592Npo"><b><u>MevX</u></b></a>`);
        msg.push(`<a href="https://t.me/BitFootBot?start=buy=${mintId}_Solana_WpMubg"><b><u>BitFoot</u></b></a>`);
        result = result + msg.join(' • ') + '\n';
        return result;
    }

    private static getChartMessage(mintId: string): string {
        let result = [`📈 <a href="https://mevx.io/solana/${mintId}?ref=zHU2qV592Npo"><b><u>MevX</u></b></a>`];
        return result.join(' • ') + '\n';
    }
}

