import { Bot, InlineKeyboard } from "grammy";
import dotenv  from "dotenv";
import { ethers } from "ethers";
import { getLendInfo } from "./commands/lend";
import { getBorrowAndLendInfo } from "./commands/borrowAndLend";
import { insertData,insertBotWallet, getUserWalletAddress, getBotWalletAddress, getBotWalletPrivateKey, insertWeiAmount, getWeiAmount } from "./helpers/db";
import pheripheryAbi from "./pheripheryAbi.json";
import usdtAbi from "./usdt_abi.json";
import senderAbi from "./senderAbi.json";
import addresses from "./addresses.json";
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

// Function to call getLimits on the periphery contract
async function getLimits(eulerSwap: string, tokenIn: string, tokenOut: string) {
  try {

    // Create provider (you can use your preferred RPC endpoint)
    const provider = new ethers.JsonRpcProvider(process.env.BNB_RPC|| "https://bsc-dataseed1.binance.org/");
    
    // Create contract instance
    const contractAddress = addresses.contracts.periphery;
    const contract = new ethers.Contract(contractAddress, pheripheryAbi, provider);
    
    // Call getLimits function
    const limits = await contract.getLimits(eulerSwap, tokenIn, tokenOut);
    
    
    return {
      minAmount: limits[0],
      maxAmount: limits[1],
      minAmountFormatted: ethers.formatUnits(limits[0], 18),
      maxAmountFormatted: ethers.formatUnits(limits[1], 18)
    };
  } catch (error) {
    console.error("Error calling getLimits:", error);
    throw error;
  }
}

async function checkLimits(wei_amount:number,eulerSwap:string,tokenIn:string,tokenOut:string){
  const provider = new ethers.JsonRpcProvider(process.env.BNB_RPC || "https://bsc-dataseed1.binance.org/");
    
  // Create contract instance
  const contractAddress = addresses.contracts.periphery;
  const contract = new ethers.Contract(contractAddress, pheripheryAbi, provider);
  
  // Call getLimits function
  const limits = await contract.getLimits(eulerSwap, tokenIn, tokenOut);
  
  
  if(wei_amount >= limits[0]){
    return false;
  }else{
    return true;
  }
  
}

// Function to approve USDT spending on the periphery contract
async function approveUSDT(privateKey: string, amount: bigint,ctx:any,tokenAddress:string) {
  try {
    const spenderAddress = addresses.defaults.celo_sender_contract;
    // Create provider
    const provider = new ethers.JsonRpcProvider(process.env.CELO_RPC || "https://rpc.ankr.com/celo");
    
    const receiverContractAddress = addresses.contracts.bnb_receiverContract;
    const provider_bnb = new ethers.JsonRpcProvider(process.env.BNB_RPC || "https://bsc-dataseed1.binance.org/");
    // Create wallet instance
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Create USDT contract instance
    const usdtContract = new ethers.Contract(tokenAddress, usdtAbi, wallet);
    const bnb_receiverContract = new ethers.Contract(addresses.tokens.usdt.bsc, usdtAbi, provider_bnb);
    
    // Check current allowance first
    console.log("Wallet Address:", wallet.address);
    console.log("Spender Address:", spenderAddress);
    let balance_bnb_usdt = await bnb_receiverContract.balanceOf(receiverContractAddress);
    balance_bnb_usdt = Number(balance_bnb_usdt)/10**12;
    console.log("Balance of BNB Receiver Contract:", balance_bnb_usdt);
    const currentAllowance = await usdtContract.allowance(wallet.address, spenderAddress);
    console.log("Current Allowance:", currentAllowance);
    // If current allowance is sufficient, no need to approve
    if (currentAllowance >= amount) {

     ctx.reply("✅ Sufficient allowance already exists");
     if(amount > balance_bnb_usdt){ 
      await ctx.reply("Enter a lower amount of USDT, Insufficient balance in BNB Receiver Contract");
      return {
        success: false,
        message: "Insufficient balance in BNB Receiver Contract"
      };
     }else{
      await ctx.reply(" ✅ Sufficient balance in BNB Receiver Contract");
      return {
        success: true
      };
     }

    }
    
    if(amount > balance_bnb_usdt){ 
      await ctx.reply("Enter a lower amount of USDT, Insufficient balance in BNB Receiver Contract");
      return {
        success: false,
        message: "Insufficient balance in BNB Receiver Contract"
      };
     }else{
    // Approve the amount
    await ctx.reply("Approving USDT...");
    
    const approveTx = await usdtContract.approve(spenderAddress, amount);
    
    // Wait for transaction confirmation
    const receipt = await approveTx.wait();
    
    await ctx.reply(`✅ USDT approval successful! \n\n  Celo Scan Link : https://celoscan.io/tx/${receipt.hash}`);
   
    return {
      success: true,
    };
     }


    
  } catch (error) {
    console.error("❌ Error approving USDT:", error);
    return {
      success: false,
      message: "Failed to approve USDT",
      error: error
    };
  }
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
   botWalletMenu += `*Bot Wallet Address:* \n\n ${wallet![0].botWallet}`
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
  try {
    // Use addresses from addresses.json
    const eulerSwap = addresses.contracts.eulerSwap;
    const tokenIn = addresses.tokens.usdt.bsc;
    const tokenOut = addresses.tokens.usd1.bsc;
    
    const limits = await getLimits(eulerSwap, tokenIn, tokenOut);
    
    await ctx.reply(`📊 *Swap Limits for USDT → USD1*\n\n` +
      `Available Token 1 Amount: ${Number(limits.minAmountFormatted).toFixed(2)} USDT\n` +
      `Available Token 2 Amount: ${Number(limits.maxAmountFormatted).toFixed(2)} USD1\n\n` +
      `Please enter the amount of USDT you want to swap:`, {
      parse_mode: "Markdown"
    });
  } catch (error) {
    await ctx.reply("❌ Error fetching swap limits. Please try again later.");
    console.error("Error in USDT_TO_USD1 callback:", error);
  }
});

// Ethereum address regex pattern
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

// Addresses from addresses.json
const CELO_USDT_TOKEN_ADDRESS = addresses.tokens.usdt.celo;
const eulerSwap = addresses.contracts.eulerSwap;
const tokenIn = addresses.tokens.usdt.bsc;
const tokenOut = addresses.tokens.usd1.bsc;
const axelarContractAddress = addresses.contracts.axelarSender;
const receiverContractAddress = addresses.contracts.bnb_receiverContract;
const receiverChain = addresses.defaults.receiverChain;
const receiver = addresses.defaults.receiver;
//This function would be added to the dispatcher as a handler for messages coming from the Bot API
bot.on("message", async (ctx) => {
  //Print to console

  if(ctx.message.text !== undefined){
// Check if it's a number
    if(!ctx.message.text.includes("0x") && Number(ctx.message.text) > 0){
      console.log("Cming is first If");
      let amount = ctx.message.text;
      let wei_6_amount = ethers.parseUnits(amount, 6);
      const wei_18_amount = ethers.parseUnits(amount, 18);
      console.log(Number(wei_6_amount));
      let checkLimit:boolean = await checkLimits(Number(wei_18_amount),eulerSwap,tokenIn,tokenOut);
      console.log("Check Limit:", checkLimit);
      //Check Limits
             if(checkLimit){
              await insertWeiAmount(ctx.chat!.username!,Number(wei_6_amount));
              await ctx.reply("Amount is within limits. Approving USDT and preparing swap...");
              let privateKey:any = await getBotWalletPrivateKey(ctx.chat!.username!);
              const approvalResult = await approveUSDT(privateKey.privateKey, wei_6_amount,ctx,CELO_USDT_TOKEN_ADDRESS);
              if (!approvalResult.success) {
                await ctx.reply(`❌ Approval failed: ${approvalResult.message}`);
              }else{

                await ctx.reply("Please enter *Receiver's Address on BNB Mainnet for USD1 tokens*, \n keep it blank if you want to swap to your own wallet\n");

              }
        }
         else{
          await ctx.reply("Amount is not within limits");
         }
         
     } else {
      console.log("Coming is else");
      //Entering a string , can be track address ro receiver's address
       // Handle receiver address input
       if (ETH_ADDRESS_REGEX.test(ctx.message.text!)) {
        console.log("Coming in second if");
         let temp_receiver = ctx.message.text;
         
         // Get bot wallet and check if it exists
         let botWallet:any = await getBotWalletAddress(ctx.chat!.username!);
         if (botWallet && botWallet.length > 0) {
          console.log("Reached destination");
           console.log("✅ Bot wallet exists - Call status: READY");
           console.log("Bot wallet address:", botWallet[0].botWallet);
           console.log("Receiver address:", temp_receiver);
           
           let privateKey:any = await getBotWalletPrivateKey(ctx.chat!.username!);
           
           try {
             // First, approve USDT spending
             let wei_amount_data = await getWeiAmount(ctx.chat!.username!);
             
             await ctx.reply("Calling Smart contract to send Tokens and execute Cross Chain Euler Swap");
             
             // Now perform the swap
             let provider = new ethers.JsonRpcProvider(process.env.CELO_RPC || "https://rpc.ankr.com/celo");
             let wallet = new ethers.Wallet(privateKey.privateKey, provider);
             let contract = new ethers.Contract(axelarContractAddress, senderAbi, wallet);
             const crossChainFee = ethers.parseEther("0.8"); // 0.8 ETH

             const gasEstimate = await contract.sendContractCall.estimateGas(
              receiverChain, 
              receiverContractAddress, 
              wei_amount_data![0].wei_amount, 
              "USDT-USD1", 
              receiver,
              {value: crossChainFee}
            );

            let swap = await contract.sendContractCall(
              receiverChain, 
              receiverContractAddress, 
              wei_amount_data![0].wei_amount, 
              "USDT-USD1", 
              receiver,
              {
                value: crossChainFee,
                gasLimit: (Number(gasEstimate)*120)/100 // 20% buffer
              }
            );
             //console.log("Swap transaction:", swap);
             await ctx.reply("✅ Swap transaction submitted! Waiting for confirmation...");
             

             // Wait for transaction confirmation
             const receipt = await swap.wait();
             await ctx.reply(`✅ Transaction submitted successfully!\n\n  Celo Scan Link : https://celoscan.io/tx/${receipt.hash}\n\n  Axelar Scan Link : https://axelarscan.io/gmp/search?sourceChain=celo&destinationChain=binance \n\n Operation Successful,you'll receive your USD1 on BNB chain after the block finality and on ${receiver} address `);
             
            }catch(error){
              console.log("Error:", error);
            }
         } else {
                     // Store the receiver address for later use
                     let status:any = await insertData(ctx.chat!.username!, ctx.message.text!, ctx.chat!.id);
                     await ctx.reply("✅ Receiver address set successfully! Bot wallet is ready for transactions.");
         }
       } else {
         // Message is not a valid Ethereum address
         await ctx.reply("Invalid Input, please enter a valid Ethereum address");
       }
     }
   }
 });

//Start the Bot
bot.start();
