import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
	? process.env.ALLOWED_ORIGINS.split(',')
	: [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
	const origin = req.headers.origin;
	
	if (origin && ALLOWED_ORIGINS.includes(origin)) {
		res.setHeader('Access-Control-Allow-Origin', origin);
		res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST')
		res.setHeader(
			'Access-Control-Allow-Headers',
			'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
		)
	} else {
		return res.status(403).json({ error: 'Access denied' });
	}
	
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
				content: `Ты профессиональный переводчик. Переводи текст с русского на ${targetLang}, сохраняя стиль, тон и структуру. Важно: если в оригинале используется обращение на "ты", сохраняй его в переводе. Отвечай ТОЛЬКО в JSON-формате.`
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
			},
			store: true,
		});
		
		console.log("🔹 OpenAI raw response:", JSON.stringify(completion, null, 2));
		
		const content = completion.choices[0]?.message?.content;
		console.log("🔹 Extracted content:", content);
		
		if (!content) {
			throw new Error("OpenAI API response is empty or null");
		}
		
		const translatedData = JSON.parse(content).input;
		res.status(200).json(translatedData);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
}
