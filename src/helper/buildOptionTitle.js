import getFieldValue from "./getFieldValue.js";
// 傳入單一行
// 回傳 option title

export default function buildOptionTitle(row) {
    let title = '';
    const option1 = getFieldValue(row, 'Option1 Value') || "";
    const option2 = getFieldValue(row, 'Option2 Value') || "";
    const option3 = getFieldValue(row, 'Option3 Value') || "";

    // 組合title
    if (option1 !== "") {
        title = option1.trim();;
    }

    if (option2 !== "") {
        title = title + " / " + option2.trim();;
    }

    if (option3 !== "") {
        title = title + " / " + option3.trim();;
    }

    if(title === ""){
        title = 'Default Title'
    }

    return title
} 