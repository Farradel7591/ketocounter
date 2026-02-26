import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const description = body.description || body.text || '';
    
    // Get API key from environment or request header
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

    const response = await fetch(GROQ_API_URL, {
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
            content: `Eres un nutricionista experto en dieta cetogénica. Analiza las comidas y devuelve SOLO JSON válido con este formato exacto:
{"foods":[{"name":"nombre","calories":100,"carbs":5,"protein":10,"fat":3,"fiber":1,"netCarbs":4,"servingSize":100,"unit":"g"}],"totalNutrition":{"calories":100,"carbs":5,"protein":10,"fat":3,"fiber":1,"netCarbs":4}}
Carbohidratos netos = carbohidratos - fibra. Sin explicaciones, solo JSON.`
          },
          {
            role: 'user',
            content: `Analiza esta comida: "${description}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq API error:', error);
      return NextResponse.json({
        success: false,
        error: 'Error de API. Verifica tu API key de Groq.'
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON
    let jsonStr = content;
    if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    const jsonMatch = jsonStr.match(/\{[\s\S]*"foods"[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    try {
      const result = JSON.parse(jsonStr.trim());
      
      if (!result.foods || !Array.isArray(result.foods) || result.foods.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No identifiqué alimentos. Intenta: "2 huevos fritos"'
        });
      }
      
      if (!result.totalNutrition) {
        result.totalNutrition = result.foods.reduce((acc: any, f: any) => ({
          calories: acc.calories + (f.calories || 0),
          carbs: acc.carbs + (f.carbs || 0),
          protein: acc.protein + (f.protein || 0),
          fat: acc.fat + (f.fat || 0),
          fiber: acc.fiber + (f.fiber || 0),
          netCarbs: acc.netCarbs + (f.netCarbs || 0)
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
      console.error('Parse error:', parseError);
      return NextResponse.json({
        success: false,
        error: 'No pude procesar. Intenta: "huevo frito"'
      });
    }
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error'
    });
  }
}
