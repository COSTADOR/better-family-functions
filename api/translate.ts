import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import {z} from 'zod';
import {zodResponseFormat} from 'openai/helpers/zod';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
	? process.env.ALLOWED_ORIGINS.split(',')
	: [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
	const origin = req.headers.origin;
	
	if (origin && ALLOWED_ORIGINS.length && !ALLOWED_ORIGINS.includes(origin)) {
		return res.status(403).json({ error: 'Access denied' });
	}
	
	if (origin) {
		res.setHeader('Access-Control-Allow-Origin', origin);
		res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
		res.setHeader(
			'Access-Control-Allow-Headers',
			'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
		)
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
				content: `Ты профессиональный переводчик и редактор. Переводи текст с русского на ${targetLang}, адаптируя его чтобы он звучал естественно для носителя языка.
				- Корректируй синтаксис и лексику, чтобы перевод соответствовал нормам целевого языка.
        		- Делай текст плавным и естественным, если есть разговорные выражения, адаптируй их, используя аналогичные фразы, привычные носителям.
        		- Если в оригинале используется обращение на "ты", сохраняй его в переводе.
        		- Если фраза может быть понята двусмысленно или неестественно звучит в целевом языке, переформулируй её для лучшего восприятия.
        		- Переводи заголовок (title) учитывая что он должен соответствовать смыслу описания (description). Он должен быть естественным для носителей языка.
        		- Сохраняй логическую структуру текста, чтобы порядок соответствовал оригиналу.`
			},
			{
				role: 'user',
				content: JSON.stringify({ input: requestData })
			}
		];
		
		const TranslationSchema = z.object({
			title: z.string(),
			description: z.string(),
			importance: z.string().optional(),
			steps: z.array(z.string()).optional(),
		});
		
		const completion = await openai.chat.completions.create({
			model: 'gpt-4o',
			messages: messages,
			response_format: zodResponseFormat(TranslationSchema, 'translation'),
		});
		
		if (!completion.choices || completion.choices.length === 0 || !completion.choices[0]?.message?.content) {
			return res.status(500).json({ error: "OpenAI API returned an empty response" });
		}
		
		const content = completion.choices[0]?.message?.content;
		const translatedData = JSON.parse(content);
		res.status(200).json(translatedData);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
}
