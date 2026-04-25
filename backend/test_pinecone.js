import dotenv from 'dotenv';
dotenv.config();
import { Pinecone } from '@pinecone-database/pinecone';

async function test() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.Index("ha-rag-index");
    
    try {
        console.log("Testing array syntax...");
        await index.namespace("test-ns").deleteAll();
        console.log("Array syntax passed");
    } catch (e) {
        console.error("Array syntax failed:");
        console.error(e);
    }
}
test();
