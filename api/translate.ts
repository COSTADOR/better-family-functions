import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");
	
	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}
	
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}
	
	try {
		const { title, description, importance, steps, targetLang } = req.body;
		
		if (!title || !description || !targetLang) {
			return res.status(400).json({ error: 'Missing required fields' });
		}
		
		const requestData: any = { title, description };
		if (importance) requestData.importance = importance;
		if (steps && steps.length > 0) requestData.steps = steps;
		
		const messages: OpenAI.ChatCompletionMessageParam[] = [
			{
				role: 'system',
				content: `Ты профессиональный переводчик. Переведи данные с русского на ${targetLang}, сохраняя точность и структуру. Отвечай ТОЛЬКО в JSON-формате.`
			},
			{
				role: 'user',
				content: JSON.stringify({ input: requestData })
			}
		];
		
		const completion = await openai.chat.completions.create({
			model: 'gpt-4o',
			messages: messages,
			response_format: {
				type: 'json_object'
			}
		});
		
		const content = completion.choices[0]?.message?.content;
		if (!content) {
			throw new Error("OpenAI API response is empty or null");
		}
		
		const translatedData = JSON.parse(content).input;
		res.status(200).json(translatedData);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
}
