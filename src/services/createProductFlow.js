import productBuilder from "./productBuilder.js"
import translateWriter from "./translateWriter.js"
import metafieldsWriter from "./metafieldsWriter.js"
import productVariantsBuilder from "./productVariantsBuilder.js"

export default async function createProductFlow(products, metafields, translations, variants) {

    try {
        await productBuilder(products);
        await metafieldsWriter(metafields);
        await translateWriter(translations);
        await productVariantsBuilder(variants);

        console.log("✅ 建立產品完整流程結束");
    } catch (error) {
        console.error(`❌ 建立產品總流程發生錯誤：${error.message}`);
    }

}