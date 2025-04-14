type Format = {
    data: string[];
    attr: string[];
};

export const renewFormat: Record<string, Format> = {
    format1: {
        data: ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"],
        attr: ["(T)", "T、",], //T代表上面的字這邊就是顯示兩種 一、(一)
    },
    format2: {
        data: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        attr: ["T、", "(T)", "(T)."], //這邊就是顯示三種1、 (1) (1).
    },
    format3: {
        data: ["１", "２", "３", "４", "５", "６", "７", "８", "９", "１０"],
        attr: ["T、", "(T)", "(T)."],
    },
    format4: {
        data: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z'],
        attr: ["T."],
    },
    format5: {
        data: ['壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖', '拾'],
        attr: ["T、"],
    },
    format6: {
        data: ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
        attr: ["T、", "(T)"],
    },
    format7: {
        data: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"],
        attr: ["T、", "(T)"],
    }
}
// 預設的序號呈現
export const defLists: Record<string, string> = {
    '0': "format1-0",
    '1': "format1-1",
    '2': "format3-0",
    '3': "format3-1",
    '4': "format6-0",
    '5': "format6-1",
    '6': "format7-0",
    '7': "format7-1",
}