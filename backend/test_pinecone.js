import dotenv from 'dotenv';
dotenv.config();
import { Pinecone } from '@pinecone-database/pinecone';

async function test() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index("ha-rag-index"); // Fixed: use lowercase 'index' method
    
    try {
        console.log("Testing Pinecone connection...");
        await index.namespace("test-ns").deleteAll();
        console.log("Pinecone connection successful!");
    } catch (e) {
        console.error("Pinecone connection failed:");
        console.error(e);
    }
}
test();
