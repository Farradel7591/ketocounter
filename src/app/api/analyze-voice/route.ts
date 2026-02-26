import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
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
    if (error.name === 'AbortError') throw new Error('Request timeout');
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { audioBase64 } = await request.json();

    if (!audioBase64) {
      return NextResponse.json({ success: false, error: 'Se requiere audio' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY || request.headers.get('X-Groq-API-Key');
    
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key no configurada.' });
    }

    // Remove data URL prefix if present
    const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(cleanBase64, 'base64');
    
    console.log(`Audio size: ${(audioBuffer.length / 1024).toFixed(1)}KB`);
    
    // Create form data
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'es');
    formData.append('response_format', 'json');

    const response = await fetchWithTimeout(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData
    }, TIMEOUT_MS);

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq ASR error:', response.status, error);
      
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({ success: false, error: 'API Key inválida. Verifica en console.groq.com' });
      }
      if (response.status === 429) {
        return NextResponse.json({ success: false, error: 'Límite de API alcanzado. Espera un momento.' });
      }
      return NextResponse.json({ success: false, error: 'Error al transcribir audio.' });
    }

    const data = await response.json();
    const transcription = data.text?.trim();

    if (!transcription) {
      return NextResponse.json({
        success: false,
        error: 'No pude entender el audio. Habla más claro o usa la opción de escribir.'
      });
    }

    console.log('Transcription:', transcription);

    return NextResponse.json({
      success: true,
      transcription
    });
  } catch (error: any) {
    console.error('Error transcribing audio:', error);
    if (error.message === 'Request timeout') {
      return NextResponse.json({ success: false, error: 'Tiempo de espera agotado. Intenta de nuevo.' });
    }
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al transcribir el audio'
    });
  }
}
