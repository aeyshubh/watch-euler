import { Bot, InlineKeyboard } from "grammy";
import dotenv  from "dotenv";
import { getLendInfo } from "./commands/lend";
import { getBorrowAndLendInfo } from "./commands/borrowAndLend";
import { insertData,insertBotWallet, getUserWalletAddress } from "./helpers/db";
dotenv.config();

//Store bot screaming status
let screaming = false;

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

bot.api.setMyCommands([
    { command: "start", description: "Get menu for different actions on this bot" }
]);

//Pre-assign button text
const lendButton = 'Lend';
const borrowAndLend = 'Borrow and Lend';
const trackWallet = 'Track Wallet';

//Build keyboards
const firstMenuMarkup = new InlineKeyboard().text(lendButton, lendButton).text(borrowAndLend, borrowAndLend).text(trackWallet, trackWallet);
 

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


// Ethereum address regex pattern
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

//This function would be added to the dispatcher as a handler for messages coming from the Bot API
bot.on("message", async (ctx) => {
  //Print to console

  if(ctx.message.text !== undefined){
    // Check if the message is a valid Ethereum address
    if (ETH_ADDRESS_REGEX.test(ctx.message.text)) {
      let status:any = await insertData(ctx.chat!.username!,ctx.message.text,ctx.chat!.id);
        await ctx.reply("Wallet address added successfully");
    } else {
      // Message is not a valid Ethereum address
      await ctx.reply("Invalid Ethereum address format,enter a valid address");
    }
  }

});

//Start the Bot
bot.start();
