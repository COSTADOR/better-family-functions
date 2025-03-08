import type { VercelRequest, VercelResponse } from '@vercel/node';

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
	const origin = req.headers.origin;
	const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
	
	if (origin && ALLOWED_ORIGINS.length && !ALLOWED_ORIGINS.includes(origin)) {
		return res.status(403).json({ error: 'Access denied' });
	}
	
	if (origin) {
		res.setHeader('Access-Control-Allow-Origin', origin);
		res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	}
	
	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}
	
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}
	
	try {
		const data = req.body;
		
		const googleResponse = await fetch(GOOGLE_SCRIPT_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'text/plain;charset=utf-8'
			},
			body: JSON.stringify(data)
		});
		
		const result = await googleResponse.json();
		
		res.status(googleResponse.status).json(result);
	} catch (error: any) {
		console.error("Error in proxy:", error);
		res.status(500).json({ error: error.message });
	}
}
