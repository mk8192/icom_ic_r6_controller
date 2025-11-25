/**
 * 周波数をICOMデータ形式に変換
 * @param {*} input 
 * @returns 
 */
function convertNumberToBytes(input) {
    // 入力数値を文字列に変換し、桁ごとの処理を行いやすくする
    let strInput = input.toString().padStart(12, '0');  // 最大12桁の数値に対応するために0埋めする

    let result = [0x00, 0x00, 0x00, 0x00, 0x00];

    // 1バイト目（10の位と1の位）
    let tens = parseInt(strInput.charAt(10), 10);   // 10の位
    let ones = parseInt(strInput.charAt(11), 10);   // 1の位
    result[0] = (tens * 16) + ones;

    // 2バイト目（1000の位と100の位）
    let thousands = parseInt(strInput.charAt(8), 10);  // 1,000の位
    let hundreds = parseInt(strInput.charAt(9), 10);   // 100の位
    result[1] = (thousands * 16) + hundreds;

    // 3バイト目（100000の位と10000の位）
    let hundredThousands = parseInt(strInput.charAt(6), 10);  // 100,000の位
    let tenThousands = parseInt(strInput.charAt(7), 10);      // 10,000の位
    result[2] = (hundredThousands * 16) + tenThousands;

    // 4バイト目（10000000の位と1000000の位）
    let tenMillions = parseInt(strInput.charAt(4), 10);       // 10,000,000の位
    let millions = parseInt(strInput.charAt(5), 10);          // 1,000,000の位
    result[3] = (tenMillions * 16) + millions;

    // 5バイト目（1000000000の位と100000000の位）
    let billion = parseInt(strInput.charAt(2), 10);           // 1,000,000,000の位
    let hundredMillions = parseInt(strInput.charAt(3), 10);   // 100,000,000の位
    result[4] = (billion * 16) + hundredMillions;

    return result;
}

/**
 * ICOMデータ形式を周波数に変換
 * @param {*} bytes 
 * @returns 
 */
function convertBytesToNumber(bytes) {
    // バイト配列から各桁を取り出す
    let result = 0;

    // 6バイト目（100000000000の位と10000000000の位）
    let trillion = (bytes[5] >> 4) & 0x0F;     // 上位4ビット: 100000000000の位
    let tenBillion = bytes[5] & 0x0F;          // 下位4ビット: 10000000000の位
    result += trillion * 100000000000 + tenBillion * 10000000000;

    // 5バイト目（1000000000の位と100000000の位）
    let billion = (bytes[4] >> 4) & 0x0F;      // 上位4ビット: 1000000000の位
    let hundredMillions = bytes[4] & 0x0F;     // 下位4ビット: 100000000の位
    result += billion * 1000000000 + hundredMillions * 100000000;

    // 4バイト目（10000000の位と1000000の位）
    let tenMillions = (bytes[3] >> 4) & 0x0F;  // 上位4ビット: 10000000の位
    let millions = bytes[3] & 0x0F;            // 下位4ビット: 1000000の位
    result += tenMillions * 10000000 + millions * 1000000;

    // 3バイト目（100000の位と10000の位）
    let hundredThousands = (bytes[2] >> 4) & 0x0F; // 上位4ビット: 100000の位
    let tenThousands = bytes[2] & 0x0F;            // 下位4ビット: 10000の位
    result += hundredThousands * 100000 + tenThousands * 10000;

    // 2バイト目（1000の位と100の位）
    let thousands = (bytes[1] >> 4) & 0x0F;    // 上位4ビット: 1000の位
    let hundreds = bytes[1] & 0x0F;            // 下位4ビット: 100の位
    result += thousands * 1000 + hundreds * 100;

    // 1バイト目（10の位と1の位）
    let tens = (bytes[0] >> 4) & 0x0F;         // 上位4ビット: 10の位
    let ones = bytes[0] & 0x0F;                // 下位4ビット: 1の位
    result += tens * 10 + ones;

    return result;
}

/**
 * バイト列を文字列化する
 * @param {*} data 
 * @returns 
 */
let ba2hex = (data) => {
    return Array.from(data).map(b => Number(b).toString(16).toUpperCase().padStart(2, '0')).join(',');
}