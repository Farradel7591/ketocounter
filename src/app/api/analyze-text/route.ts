import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const TIMEOUT_MS = 30000;

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const description = body.description || body.text || '';
    
    const apiKey = process.env.GROQ_API_KEY || request.headers.get('X-Groq-API-Key');
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key no configurada. Ve a Configuración para agregar tu API key de Groq.'
      });
    }
    
    if (!description || description.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Escribe algo para analizar'
      });
    }

    const response = await fetchWithTimeout(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: `Eres un nutricionista experto en dieta cetogénica. Analiza las comidas y devuelve SOLO JSON válido.
Formato exacto: {"foods":[{"name":"nombre","calories":100,"carbs":5,"protein":10,"fat":3,"fiber":1,"servingSize":100,"unit":"g"}],"totalNutrition":{"calories":100,"carbs":5,"protein":10,"fat":3,"fiber":1,"netCarbs":4}}
- netCarbs = carbs - fibra (siempre calcular)
- fiber es OBLIGATORIO, nunca 0 para verduras/frutas
- Sin explicaciones, solo JSON puro.`
          },
          {
            role: 'user',
            content: `Analiza esta comida: "${description}"`
          }
        ],
        temperature: 0.2,
        max_tokens: 800
      })
    }, TIMEOUT_MS);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({
          success: false,
          error: 'API Key inválida. Verifica en console.groq.com'
        });
      }
      if (response.status === 429) {
        return NextResponse.json({
          success: false,
          error: 'Límite de API alcanzado. Espera un momento.'
        });
      }
      return NextResponse.json({
        success: false,
        error: 'Error de API. Intenta de nuevo.'
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON robustly
    let jsonStr = content;
    // Remove markdown code blocks
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    // Find JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*"foods"[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    try {
      const result = JSON.parse(jsonStr.trim());
      
      if (!result.foods || !Array.isArray(result.foods) || result.foods.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No identifiqué alimentos. Ejemplo: "2 huevos fritos"'
        });
      }
      
      // Ensure all foods have required fields and calculate netCarbs
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
      
      // Calculate total nutrition
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
      
      return NextResponse.json({ 
        success: true, 
        data: {
          foods: result.foods,
          totalNutrition: result.totalNutrition
        }
      });
    } catch (parseError: any) {
      console.error('Parse error:', parseError, 'Content:', content.substring(0, 200));
      return NextResponse.json({
        success: false,
        error: 'No pude procesar. Intenta: "huevo frito con tocino"'
      });
    }
  } catch (error: any) {
    console.error('Error:', error);
    if (error.message === 'Request timeout') {
      return NextResponse.json({
        success: false,
        error: 'Tiempo de espera agotado. Intenta de nuevo.'
      });
    }
    return NextResponse.json({
      success: false,
      error: 'Error inesperado. Intenta de nuevo.'
    });
  }
}
