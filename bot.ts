import { Bot, InlineKeyboard } from "grammy";
import dotenv  from "dotenv";
import { ethers } from "ethers";
import { getLendInfo } from "./commands/lend";
import { getBorrowAndLendInfo } from "./commands/borrowAndLend";
import { insertData,insertBotWallet, getUserWalletAddress, getBotWalletAddress, getBotWalletPrivateKey } from "./helpers/db";
dotenv.config();

//Store bot screaming status
let screaming = false;

// Function to generate Ethereum wallet
function generateEthereumWallet() {
  const wallet = ethers.Wallet.createRandom();
  const address = wallet.address;
  const privateKey = wallet.privateKey;
  
  console.log("=== Generated Ethereum Wallet ===");
  console.log("Address:", address);
  console.log("Private Key:", privateKey);
  console.log("==================================");
  
  return { address, privateKey };
}

//Create a new bot
const bot = new Bot(process.env.BOT_TOKEN!);

//This function handles the /scream command
bot.command("scream", () => {
   screaming = true;
 });

//This function handles /whisper command
bot.command("whisper", () => {
   screaming = false;
 });

//Pre-assign menu text
const firstMenu = "<b>Main Menu</b>\n\nWelcome to the Watch Euler Bot \n\n Using this bot you can monitor your Euler positions in realtime";
let botWalletMenu = "*Bot Wallet Menu* \n\n Top\\-Up the Below wallet to create Euler swap positions in seconds\\. \n\n Currently following actions are available: \n\n 1\\. Leverage Swap USDT on *CELO* for USD1 on BNB Mainnet \n\n _To perform this,please add CELO tokens in the Bot Walllet\\._";
bot.api.setMyCommands([
    { command: "start", description: "Get menu for different actions on this bot" }
  ]);

//Pre-assign button text
const lendButton = 'Lend';
const borrowAndLend = 'Borrow and Lend';
const trackWallet = 'Track Wallet';
const botWallet = 'Bot Wallet';

const USDT_TO_USD1 = "USDT to USD1";
const privateKey = "Private Key";
//Build keyboards
const firstMenuMarkup = new InlineKeyboard().text(lendButton, lendButton).text(borrowAndLend, borrowAndLend).text(trackWallet, trackWallet).text(botWallet, botWallet);
 const botWalletMarkup = new InlineKeyboard().text(USDT_TO_USD1,USDT_TO_USD1).text(privateKey,privateKey);

//This handler sends a menu with the inline buttons we pre-assigned above
bot.command("start", async (ctx) => {
  await ctx.reply(firstMenu, {
    parse_mode: "HTML",
    reply_markup: firstMenuMarkup,
  });
});


bot.callbackQuery(trackWallet, async (ctx) => {
  console.log("track wallet");  
  const data = await ctx.api.sendMessage(ctx.chat!.id, "Please enter your wallet address");
  console.log(data);

});

//This handler processes back button on the menu
bot.callbackQuery(lendButton, async (ctx) => {
  let userId = ctx.from!.username!; 
  let walletAddress = await getUserWalletAddress(userId);
  //Update message content with corresponding menu section
  let message = await getLendInfo(walletAddress![0].walletAddress!);
  await ctx.editMessageText(message, {
    reply_markup: firstMenuMarkup,  
    parse_mode: "HTML",
   });
 });

//This handler processes next button on the menu
bot.callbackQuery(borrowAndLend, async (ctx) => {
  //Update message content with corresponding menu section
  let userId = ctx.from!.username!; 
  let walletAddress = await getUserWalletAddress(userId);
  let message = await getBorrowAndLendInfo(walletAddress![0].walletAddress!);
  await ctx.editMessageText(message, {
    reply_markup: firstMenuMarkup,  
    parse_mode: "HTML", 
   });
 });


 bot.callbackQuery(botWallet, async (ctx) => {
  let userId = ctx.from!.username!;
  let wallet = await getBotWalletAddress(userId);
  if(wallet && wallet.length > 0){
   botWalletMenu += `*Bot Wallet Address:* \n\`\`\`${wallet![0].botWallet}\`\`\``
    await ctx.editMessageText(botWalletMenu, {
      reply_markup: botWalletMarkup,
      parse_mode: "MarkdownV2",
    });
  }else{
    const wallet = generateEthereumWallet();
    await insertBotWallet(userId,wallet.address,wallet.privateKey,ctx.chat!.id);
    await ctx.reply("✅ New Ethereum wallet generated! Check the console for details.");
  }

});

bot.callbackQuery(privateKey, async (ctx) => {
  let userId = ctx.from!.username!;
  let privateKey:any = await getBotWalletPrivateKey(userId);
  let botWallet:any = await getBotWalletAddress(userId);
  if(privateKey && privateKey.privateKey.length > 0 && botWallet && botWallet.length > 0){
    await ctx.editMessageText(`*Bot Wallet Address:* \n\`\`\`${botWallet![0].botWallet}\`\`\`\n\n*Private Key:* \n\`\`\`${privateKey!.privateKey}\`\`\``, {
      reply_markup: botWalletMarkup,
      parse_mode: "MarkdownV2",
    });
  }else{
    await ctx.editMessageText("No bot wallet found,please generate a new wallet", {
      reply_markup: botWalletMarkup,
      parse_mode: "HTML",
    });
  }
});

bot.callbackQuery(USDT_TO_USD1, async (ctx) => {
 ctx.reply("Please enter the amount of USDT you want to swap");
  
});

// Ethereum address regex pattern
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

//This function would be added to the dispatcher as a handler for messages coming from the Bot API
bot.on("message", async (ctx) => {
  //Print to console

  if(ctx.message.text !== undefined){
    // Check if the message is a valid Ethereum address
    if(Number(ctx.message.text) > 0){
      let amount = ctx.message.text;
      let wei_amount = ethers.parseUnits(amount, 18);
      console.log(wei_amount);
    }else{
      if (ETH_ADDRESS_REGEX.test(ctx.message.text)) {
        let status:any = await insertData(ctx.chat!.username!,ctx.message.text,ctx.chat!.id);
          await ctx.reply("Wallet address added successfully");
      } else {
        // Message is not a valid Ethereum address
        await ctx.reply("Invalid Ethereum address format,enter a valid address");
      }
    }
   
  }

});

//Start the Bot
bot.start();
