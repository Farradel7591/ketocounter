import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_VISION_MODEL = 'llama-3.2-90b-vision-preview';

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'Se requiere una imagen' },
        { status: 400 }
      );
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

    if (imageSizeKB > 4000) {
      return NextResponse.json(
        { success: false, error: 'La imagen es muy grande. Intenta con una más pequeña.' },
        { status: 400 }
      );
    }

    const imageUrl = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    const response = await fetch(GROQ_API_URL, {
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
            content: `Eres un nutricionista experto en dieta cetogénica. Analiza las fotos de comida y devuelve SOLO JSON válido con este formato:
{"foods":[{"name":"nombre","calories":100,"carbs":5,"protein":10,"fat":3,"fiber":1,"netCarbs":4,"servingSize":100,"unit":"g"}]}
Carbohidratos netos = carbohidratos - fibra. Sin explicaciones, solo JSON.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analiza esta comida e identifica todos los alimentos. Estima las cantidades y calcula los valores nutricionales. Responde SOLO con JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq Vision API error:', error);
      return NextResponse.json({
        success: false,
        error: 'Error al analizar imagen. Intenta con texto.'
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log('Vision response:', content.substring(0, 300));

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
      
      if (!result.foods || result.foods.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No se detectaron alimentos claros. Intenta describir tu comida con texto.'
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
      
      return NextResponse.json({ success: true, data: result });
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({
        success: false,
        error: 'No pude analizar la imagen. Intenta con texto.',
        rawResponse: content.substring(0, 200)
      });
    }
  } catch (error: any) {
    console.error('Error analyzing photo:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al procesar: ' + (error.message || 'desconocido')
    });
  }
}
