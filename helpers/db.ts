
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js'

dotenv.config();


export const supabase = createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_ANON_KEY!);

export const insertData = async (tgId: string, walletAddress: string,chatId:number) => {
    try {
        let { error } = await supabase.from('user').insert([{ tgId:tgId,walletAddress:walletAddress,chat_id:chatId }]);
     
    } catch (e) {   
        console.log("Error inserting data", e);
    }
}

export const changeAddress = async (tgid: string, data: string) => {
    try{
        let { error } = await supabase.from('user').update([{ walletAddress:data }]).eq('tgId', tgid);
    }catch(e){
        console.log("Error updating data", e);
    }
}

export const insertBotWallet = async (tgId:string,botWallet:string,privateKey:string,chatId:number)=> {
    try {
                let { error } = await supabase.from('keys').insert([{tgId:tgId,botWallet:botWallet,privateKey:privateKey,chat_id:chatId}]);
        if (error) console.log("Error at line 22-md",error);
    } catch (e) {
        console.log("Error inserting data", e);
    }
}


export const getUserWalletAddress = async (tgId: string) => {
    try {
        let { data, error } = await supabase.from('user').select("walletAddress").eq('tgId', tgId);
     
        return data;
    } catch (e) {
        console.log("Error retrieving data", e);
    }
}

export const getBotWalletAddress = async (tgId: string) => {
    try {
            let { data, error } = await supabase.from('keys').select("botWallet").eq('tgId', tgId);
     
        return data;
    } catch (e) {
        console.log("Error retrieving data", e);
    }
}

    export const getBotWalletPrivateKey = async (tgId: string) => {
    try {
        let { data, error } = await supabase.from('keys').select("privateKey").eq('tgId', tgId);
       
        return data![0];
    } catch (e) {
        console.log("Error retrieving data", e);
    }
}
