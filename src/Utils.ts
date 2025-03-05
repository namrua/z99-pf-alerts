import { QueryParams } from "./Queries";

export default class Utils {
  public static getValidTwitterUrl(officialLinks: string) {
    const twitterRegex = /^(https:\/\/x\.com\/.+\/status\/\d+)/;
    const match = officialLinks.match(twitterRegex);
    if (match && match.length > 0) {
      return match[0];
    }
    return '';
  }

  public static formatQuery(query: string, params: QueryParams): string {
    return query.replace(/{(\w+)}/g, (_, key) => {
      if (key in params) {
        const value = params[key];
        return value?.toString();
      }
      return `{${key}}`;
    });
  }

  public static shortenNumber(num?: number): string {
    if (num) {
      const absNum = Math.abs(num);
      const suffix = this.getSuffix(absNum);
      if (absNum < 1000) return (num < 0 ? '-' : '') + absNum + suffix;
      if (absNum < 1000000) return (num < 0 ? '-' : '') + (absNum / 1000).toFixed(1) + suffix;
      if (absNum < 1000000000) return (num < 0 ? '-' : '') + (absNum / 1000000).toFixed(1) + suffix;
      return (num < 0 ? '-' : '') + (absNum / 1000000000).toFixed(1) + suffix;
    }
    else if (num === 0) return '0';
    return '';
  }

  public static getSuffix(num: number): string {
    if (num < 1000) return '';
    if (num < 1000000) return 'K';
    if (num < 1000000000) return 'M';
    return 'B';
  }

  public static convertMilliseconds(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const remainingAfterDays = totalSeconds % 86400;

    const hours = Math.floor(remainingAfterDays / 3600);
    const remainingAfterHours = remainingAfterDays % 3600;

    const minutes = Math.floor(remainingAfterHours / 60);
    const seconds = remainingAfterHours % 60;

    if (days > 0) {
      return `${days}d${hours > 0 ? ':' + hours + 'h' : ''}`;
    } else if (hours > 0) {
      return `${hours}h${minutes > 0 ? ':' + minutes + 'm' : ''}`;
    } else if (minutes > 0) {
      return `${minutes}m${seconds > 0 ? ':' + seconds + 's' : ''}`;
    } else if (seconds > 0) {
      return `${seconds}s`;
    } else {
      return '0s';
    }
  }

  public static convertSecondToHumanTime(totalSeconds: number) {
    totalSeconds = Math.floor(totalSeconds);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0)
      return `${days}d`;
    if (hours > 0)
      return `${hours}h:${minutes > 0 ? minutes + 'm' : ''} `;
    if (minutes > 0)
      return `${minutes}m`;
    if (seconds > 0)
      return `${seconds}s`;
    return '0s';
  }

  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public static roundDecimals(value: number, decimals: number): number {
    if (isNaN(value)) return 0
    return parseFloat(value.toFixed(decimals));
  }


  public calculateTimeDifference = (dateString: string): number => {
    const inputDate = new Date(dateString);
    const now = new Date();

    const differenceInMilliseconds = now.getTime() - inputDate.getTime();
    const differenceInSeconds = Math.floor(differenceInMilliseconds / (1000));
    return differenceInSeconds;
  }

  public convertToHumanTime = (totalSeconds: number) => {
    const days = Math.floor(totalSeconds / 86400);
    const remainingAfterDays = totalSeconds % 86400;

    const hours = Math.floor(remainingAfterDays / 3600);
    const remainingAfterHours = remainingAfterDays % 3600;

    const minutes = Math.floor(remainingAfterHours / 60);
    const seconds = remainingAfterHours % 60;

    if (days > 0) {
      return `${days}d${hours > 0 ? ':' + hours + 'h' : ''}`;
    } else if (hours > 0) {
      return `${hours}h${minutes > 0 ? ':' + minutes + 'm' : ''}`;
    } else if (minutes > 0) {
      return `${minutes}m${seconds > 0 ? ':' + seconds + 's' : ''}`;
    } else if (seconds > 0) {
      return `${seconds}s`;
    } else {
      return '0s';
    }
  }

  public static getEmojiByGain = (gain: number) => {

    if (gain <= 3) return '🎉'
    if (gain > 3 && gain <= 5) return '🌕'
    if (gain > 5 && gain <= 10) return '🔥'
    if (gain > 10 && gain <= 20) return '🚀'
    if (gain > 20) return '🌙'
  }

  public static padStrings(strings: string, length: number): string {
    return strings.padEnd(length, ' ');
  }
}