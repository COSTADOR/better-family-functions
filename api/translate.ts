import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}
	
	try {
		const { text, targetLang } = req.body;
		
		if (!text || !targetLang) {
			return res.status(400).json({ error: 'Missing text or targetLang' });
		}
		
		const completion = await openai.chat.completions.create({
			model: 'gpt-4o',
			messages: [
				{ role: 'system', content: `Переведи следующий текст с русского на ${targetLang}.` },
				{ role: 'user', content: text },
			],
		});
		
		res.status(200).json({ translation: completion.choices[0].message.content });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
}
