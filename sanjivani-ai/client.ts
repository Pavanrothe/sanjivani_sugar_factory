
import "dotenv/config";
import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const mcpClient = new Client({
  name: "sanjivani-farmer-client",
  version: "1.0.0",
});

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "server.ts"],
});

async function main() {
  try {
    await mcpClient.connect(transport);

    const { tools } = await mcpClient.listTools();
    console.log("Available MCP tools:", tools.map(t => t.name));

    const result = await mcpClient.callTool({
      name: "get_farmer_data",
      arguments: {},
    });
if (result.isError) {
  console.error("MCP tool error:", result.content);
  throw new Error("MCP tool failed");
}

    const farmerData = result.content
      .map(item => "text" in item ? item.text : "")
      .join("\n");

    const question =
      "Which farmer supplied the most sugarcane to Sanjivani Sugar Factory, and what is their pending payment? Also give a short summary of the farmer records.Also give the total payment done to the farmers";

    const response = await openai.responses.create({
      model: "gpt-5.5",
      instructions:
        "Answer using only the supplied PostgreSQL data. Identify the farmer with the highest sugarcane supply, state their village, tons supplied and pending payment. Do not invent data.",
      input: `Question: ${question}\n\nFarmer database records:\n${farmerData}`,
    });

    console.log("\nQuestion:", question);
    console.log("\nAI Answer:\n", response.output_text);
  } finally {
    await mcpClient.close();
    
  }
}

main().catch(error => {
  console.error("Application error:", error);
  process.exitCode = 1;
});
