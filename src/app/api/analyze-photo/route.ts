import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const VISION_MODELS = ['llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview'];
const TIMEOUT_MS = 90000;

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') throw new Error('Request timeout');
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();
    if (!imageBase64) return NextResponse.json({ success: false, error: 'Se requiere una imagen' }, { status: 400 });

    const apiKey = process.env.GROQ_API_KEY || request.headers.get('X-Groq-API-Key');
    if (!apiKey) return NextResponse.json({ success: false, error: 'API key no configurada. Ve a Configuración.' });

    const imageSizeKB = Math.round(imageBase64.length / 1024);
    console.log(`Analyzing image: ${imageSizeKB}KB`);

    if (imageSizeKB < 5) return NextResponse.json({ success: false, error: 'Imagen muy pequeña o corrupta.' }, { status: 400 });
    if (imageSizeKB > 4000) return NextResponse.json({ success: false, error: 'Imagen muy grande.' }, { status: 400 });

    const imageUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
    let lastError: string | null = null;

    for (const model of VISION_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Trying model ${model}, attempt ${attempt}`);
          const response = await fetchWithTimeout(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: 'Eres un nutricionista experto. Analiza la foto de comida y devuelve SOLO JSON válido. Formato: {"foods":[{"name":"nombre","calories":100,"carbs":5,"protein":10,"fat":3,"fiber":1,"servingSize":100,"unit":"g"}],"totalNutrition":{"calories":100,"carbs":5,"protein":10,"fat":3,"fiber":1,"netCarbs":4}}. Reglas: Identifica TODOS los alimentos, estima porciones, fiber siempre numérico, netCarbs = carbs - fiber.' },
                { role: 'user', content: [
                  { type: 'text', text: 'Analiza esta foto de comida. Identifica todos los alimentos, estima porciones y calcula macros. Responde SOLO JSON.' },
                  { type: 'image_url', image_url: { url: imageUrl } }
                ]}
              ],
              temperature: 0.1,
              max_tokens: 1500
            })
          }, TIMEOUT_MS);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Model ${model} error:`, response.status, errorText);
            if (response.status === 401 || response.status === 403) return NextResponse.json({ success: false, error: 'API Key inválida. Verifica en console.groq.com' });
            if (response.status === 429) { lastError = 'Límite de API alcanzado. Espera un momento.'; continue; }
            if (response.status === 400) { lastError = 'Imagen no procesada. Intenta con texto.'; continue; }
            lastError = `Error ${response.status}`; continue;
          }

          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || '';
          console.log(`Model ${model} response:`, content.substring(0, 200));

          let jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const jsonMatch = jsonStr.match(/\{[\s\S]*"foods"[\s\S]*\}/);
          if (jsonMatch) jsonStr = jsonMatch[0];

          const result = JSON.parse(jsonStr);
          if (!result.foods || result.foods.length === 0) {
            return NextResponse.json({ success: false, error: 'No detecté alimentos claros. Intenta con mejor iluminación o usa texto.' });
          }

          result.foods = result.foods.map((f: any) => ({
            name: String(f.name || 'Alimento'), calories: Math.max(0, Number(f.calories) || 0), carbs: Math.max(0, Number(f.carbs) || 0),
            protein: Math.max(0, Number(f.protein) || 0), fat: Math.max(0, Number(f.fat) || 0), fiber: Math.max(0, Number(f.fiber) || 0),
            netCarbs: Math.max(0, (Number(f.carbs) || 0) - (Number(f.fiber) || 0)), servingSize: Math.max(1, Number(f.servingSize) || 100), unit: String(f.unit || 'g')
          }));

          if (!result.totalNutrition) {
            result.totalNutrition = result.foods.reduce((acc: any, f: any) => ({
              calories: acc.calories + f.calories, carbs: acc.carbs + f.carbs, protein: acc.protein + f.protein,
              fat: acc.fat + f.fat, fiber: acc.fiber + f.fiber, netCarbs: acc.netCarbs + f.netCarbs
            }), { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, netCarbs: 0 });
          }

          console.log(`Success with model ${model}:`, result.foods.length, 'foods');
          return NextResponse.json({ success: true, data: result });
        } catch (parseError: any) {
          console.error(`Parse error with model ${model}:`, parseError.message);
          lastError = 'La IA respondió incorrectamente. Intenta de nuevo.'; continue;
        }
      }
    }
    return NextResponse.json({ success: false, error: lastError || 'No pude analizar. Intenta con texto.' });
  } catch (error: any) {
    console.error('Error analyzing photo:', error);
    if (error.message === 'Request timeout') return NextResponse.json({ success: false, error: 'Tiempo agotado. Intenta de nuevo.' });
    return NextResponse.json({ success: false, error: 'Error: ' + (error.message || 'desconocido') });
  }
}
