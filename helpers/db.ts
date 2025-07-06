//@ts-nocheck
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js'

dotenv.config();


export const supabase = createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY);

export const insertData = async (tgId: string, data: string,chatId:number) => {
    try {
        let { error } = await supabase.from('users').insert([{ tgId:tgId,walletAddress:data,chatId:chatId }]);
     
    } catch (e) {
        console.log("Error inserting data", e);
    }
}

export const changeAddress = async (tgid: string, data: string) => {
    try{
        let { error } = await supabase.from('users').update([{ walletAddress:data }]).eq('tgId', tgid);
    }catch(e){
        console.log("Error updating data", e);
    }
}

export const insertTp = async (tgId:string,value:Number)=> {
    try {
        let { error } = await supabase.from('users').update([{takeProfit:value}]).eq('tgId', tgId);
        if (error) console.log("Error at line 22-md",error);
    } catch (e) {
        console.log("Error inserting data", e);
    }
}

export const insertSl = async (tgId:string,value:Number)=> {

    try {
        let { error } = await supabase.from('users').update([{stoploss:value}]).eq('tgId', tgId);
        if (error) console.log("Error at line 32-md",error);
    } catch (e) {
        console.log("Error inserting data", e);
    }
}

export const getDataByTgid = async (tgId: string) => {
    try {
        let { data, error } = await supabase.from('users').select("*").eq('tgId', tgId);
     
        return data;
    } catch (e) {
        console.log("Error retrieving data", e);
    }
}

export const getAllData = async () => {
    try {
        let { data, error } = await supabase.from('users').select("*");
     
        return data;
    } catch (e) {
        console.log("Error retrieving data", e);
    }
}

export const getSlAndTp = async (tgId: string) => {
    try {
        let { data, error } = await supabase.from('users').select("stoploss,takeProfit,chatId").eq('tgId', tgId);
       
        return data[0];
    } catch (e) {
        console.log("Error retrieving data", e);
    }
}
