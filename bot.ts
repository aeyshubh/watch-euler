import { Bot, InlineKeyboard } from "grammy";
import dotenv  from "dotenv";
import { getLendInfo } from "./commands/lend";
import { getBorrowAndLendInfo } from "./commands/borrowAndLend";

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

//Build keyboards
const firstMenuMarkup = new InlineKeyboard().text(lendButton, lendButton).text(borrowAndLend, borrowAndLend);
 

//This handler sends a menu with the inline buttons we pre-assigned above
bot.command("start", async (ctx) => {
  await ctx.reply(firstMenu, {
    parse_mode: "HTML",
    reply_markup: firstMenuMarkup,
  });
});

//This handler processes back button on the menu
bot.callbackQuery(lendButton, async (ctx) => {
  //Update message content with corresponding menu section
  let message = await getLendInfo("0xaB8a67743325347Aa53bCC66850f8F13df87e3AF");
  await ctx.editMessageText(message, {
    reply_markup: firstMenuMarkup,  
    parse_mode: "HTML",
   });
 });

//This handler processes next button on the menu
bot.callbackQuery(borrowAndLend, async (ctx) => {
  //Update message content with corresponding menu section
  let message = await getBorrowAndLendInfo("0xaB8a67743325347Aa53bCC66850f8F13df87e3AF");
  await ctx.editMessageText(message, {
    reply_markup: firstMenuMarkup,  
    parse_mode: "HTML", 
   });
 });


//This function would be added to the dispatcher as a handler for messages coming from the Bot API
bot.on("message", async (ctx) => {
  //Print to console
  console.log(
    `${ctx.from.first_name} wrote ${
      "text" in ctx.message ? ctx.message.text : ""
    }`,
  );

  if (screaming && ctx.message.text) {
    //Scream the message
    await ctx.reply(ctx.message.text.toUpperCase(), {
      entities: ctx.message.entities,
    });
  } else {
    //This is equivalent to forwarding, without the sender's name
    await ctx.copyMessage(ctx.message.chat.id);
  }
});

//Start the Bot
bot.start();
