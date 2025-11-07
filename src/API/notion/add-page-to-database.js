import { Client } from "@notionhq/client"
import { config } from "dotenv"

config()

const apiKey = process.env.NOTION_API_KEY
const databaseId = process.env.NOTION_DATA_ID

const notion = new Client({ auth: apiKey })

export default async function addNotionPageToDatabase(pageProperties) {
  const newPage = await notion.pages.create({
    parent: {
      database_id: databaseId,
    },
    properties: pageProperties,
  })
  return newPage
}

// const today = new Date().toISOString().split("T")[0]; // 例如 "2025-10-30"
// const sample = {
//     "Status": {
//       type: "status",
//       status: { name: "draft" },
//     },
//     "Title": {
//       type: "title",
//       title: [{ type: "text", text: { content: "10G SFP+ AOC" } }],
//     },
//     "Price(USD)": {
//       type: "number",
//       number: Number(23.4),
//     },
//     "SKU": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "AOC-SP-10G" } }],
//     },
//     "Type": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "中文 Title": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "10G SFP+ AOC光纖模組" } }],
//     },
//     "日文 Title": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "10G SFP+ AOC光纖模組 假設這是日文" } }],
//     },
//     "Handle": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "10g-sfp-aoc" } }],
//     },
//     "Collections": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "Optical Transceiver,Active Optic Cables (AOCs)" } }],
//     },
//     "Vendor": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "SpeedyFiberTX" } }],
//     },
//     "Shipping Time": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "Typically ships in 7–9 business days" } }],
//     },
//     "發貨時間": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "通常於 7-9 個工作天發貨" } }],
//     },
//     "備份日期": {
//       type: "date",
//       date: { start: today },
//     },
//     "是否開啟詢價": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "FALSE" } }],
//     },
//     "Template": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "transceiver" } }],
//     },
//     "Label 1": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "10G SFP+" } }],
//     },
//     "Label 2": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "Label 3": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "Label 4": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "Compatibility": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "Cisco" } }],
//     },

//     // SEO
//     "SEO Title": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "SEO Description": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "Tags": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "中文 SEO Description": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },

//     // 產品介紹
//     "Description": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "Highlight": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "Application": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "Feature": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "Specification": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "Specification_html": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "中文 Description": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "中文 Highlight": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "中文 Application": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "中文 Feature": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "中文 Specification": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "中文 Specification_html": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },

//     // Filter
//     "#Transceiver Type": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Fiber Mode": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Connector Type": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#ConnectorA": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Polish Type": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Transmission Mode": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Insertion Loss Grade": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Transmission Distance": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Data Rate (Gbps)": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Branch Type": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Fiber Count": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Connector Gender": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Connector Color": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Jacket Color": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Jacket": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Wavelength": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Polarity": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Body Type": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "#Gender": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },

//     // 規格表
//     "table.custom_1": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_2": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_3": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_4": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_5": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_6": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_7": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_8": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_9": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_10": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_11": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_12": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_13": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_14": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_15": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_16": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_17": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_18": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_19": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_20": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_21": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_22": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_23": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_24": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_25": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_26": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_27": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_28": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_29": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_30": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_31": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_32": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_33": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_34": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_35": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_36": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_37": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_38": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_39": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     },
//     "table.custom_40": {
//       type: "rich_text",
//       rich_text: [{ type: "text", text: { content: "" } }],
//     }
//   };

// addNotionPageToDatabase(sample) 