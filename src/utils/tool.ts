export function toFullWidthChar(iChar: string | number) {
    const aStr = String(iChar);
    return aStr.replace(/[!-~]/g, function (iStr) {
        return String.fromCharCode(iStr.charCodeAt(0) + 0xFEE0);
    });
}
/**
 * example:
 * ```ts
 * const num = getDigit(12345, 1); //num = 5;
 * const num = getDigit(76543, 2, true); //num = 6;
 * ```
 * @param number 目標數字 
 * @param place 位置
 * @param fromLeft 從左邊數過來
 * @returns 指定位置的數字
 */
export function getDigit(number: number, place: number, fromLeft: boolean = false) {
    const location = fromLeft ? getDigitCount(number) + 1 - place : place;
    return Math.floor((number / Math.pow(10, location - 1)) % 10);
}
/**
 * example:
 * ```ts
 * const num = getDigitCount(812345); //num = 6;
 * const num = getDigitCount(765); //num = 3;
 * ```
 * @param iNumber 目標數字
 * @returns 目標數字的位數
 */
export function getDigitCount(iNumber: number) {
    return (
        Math.max(Math.floor(Math.log10(Math.abs(iNumber))), 0) + 1
    );
}