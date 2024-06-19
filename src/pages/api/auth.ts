import { MongoClient } from 'mongodb';
import { NextApiRequest, NextApiResponse } from 'next';
require('dotenv').config();

const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@auth.x8k4kqg.mongodb.net/?retryWrites=true&w=majority&appName=auth`;
const client = new MongoClient(uri);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        // API LOGIC HERE...
        res.status(200).json({ message: 'Connected to MongoDB' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}