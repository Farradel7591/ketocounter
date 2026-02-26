import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_VISION_MODEL = 'llama-3.2-90b-vision-preview';
const TIMEOUT_MS = 45000;

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

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'Se requiere una imagen' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY || request.headers.get('X-Groq-API-Key');
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key no configurada. Ve a Configuración para agregar tu API key de Groq.'
      });
    }

    const imageSizeKB = Math.round(imageBase64.length / 1024);
    console.log(`Analyzing image: ${imageSizeKB}KB`);

    // Limit image size
    if (imageSizeKB > 3000) {
      return NextResponse.json({
        success: false, 
        error: 'Imagen muy grande. La app ya la comprime automáticamente.'
      }, { status: 400 });
    }

    const imageUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

    const response = await fetchWithTimeout(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        messages: [
          {
            role: 'system',
            content: `Eres un nutricionista experto en dieta cetogénica. Analiza fotos de comida.
Devuelve SOLO JSON válido: {"foods":[{"name":"nombre","calories":100,"carbs":5,"protein":10,"fat":3,"fiber":1,"servingSize":100,"unit":"g"}],"totalNutrition":{"calories":100,"carbs":5,"protein":10,"fat":3,"fiber":1,"netCarbs":4}}
- netCarbs = carbs - fibra
- fiber es OBLIGATORIO para verduras/frutas
- Estima porciones basándote en la imagen
- Sin explicaciones, solo JSON.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analiza esta comida. Identifica todos los alimentos, estima las porciones y calcula los macros. Responde SOLO con JSON.' },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 800
      })
    }, TIMEOUT_MS);

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq Vision API error:', response.status, error);
      
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({ success: false, error: 'API Key inválida. Verifica en console.groq.com' });
      }
      if (response.status === 429) {
        return NextResponse.json({ success: false, error: 'Límite de API alcanzado. Espera un momento.' });
      }
      return NextResponse.json({ success: false, error: 'Error al analizar. Intenta con texto.' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log('Vision response:', content.substring(0, 200));

    // Extract JSON
    let jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const jsonMatch = jsonStr.match(/\{[\s\S]*"foods"[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    try {
      const result = JSON.parse(jsonStr.trim());
      
      if (!result.foods || result.foods.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No se detectaron alimentos claros. Intenta con texto o mejor iluminación.'
        });
      }
      
      // Ensure all fields
      result.foods = result.foods.map((f: any) => ({
        name: f.name || 'Alimento',
        calories: Number(f.calories) || 0,
        carbs: Number(f.carbs) || 0,
        protein: Number(f.protein) || 0,
        fat: Number(f.fat) || 0,
        fiber: Number(f.fiber) || 0,
        netCarbs: Math.max(0, (Number(f.carbs) || 0) - (Number(f.fiber) || 0)),
        servingSize: Number(f.servingSize) || 100,
        unit: f.unit || 'g'
      }));
      
      if (!result.totalNutrition) {
        result.totalNutrition = result.foods.reduce((acc: any, f: any) => ({
          calories: acc.calories + f.calories,
          carbs: acc.carbs + f.carbs,
          protein: acc.protein + f.protein,
          fat: acc.fat + f.fat,
          fiber: acc.fiber + f.fiber,
          netCarbs: acc.netCarbs + f.netCarbs
        }), { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0, netCarbs: 0 });
      }
      
      return NextResponse.json({ success: true, data: result });
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({
        success: false,
        error: 'No pude analizar la imagen. Intenta con texto.',
        rawResponse: content.substring(0, 150)
      });
    }
  } catch (error: any) {
    console.error('Error analyzing photo:', error);
    if (error.message === 'Request timeout') {
      return NextResponse.json({ success: false, error: 'Tiempo de espera agotado. Intenta de nuevo.' });
    }
    return NextResponse.json({ success: false, error: 'Error al procesar: ' + (error.message || 'desconocido') });
  }
}
