// vectorService.js

import { Pinecone } from "@pinecone-database/pinecone";

let pinecone;

const getClient = () => {
    if (!pinecone) {
        pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });
    }
    return pinecone;
};

const indexName = "ha-rag-index";

export const getIndex = () => {
    return getClient().index(indexName);
};