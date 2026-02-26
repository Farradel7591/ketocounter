import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

export async function POST(request: NextRequest) {
  try {
    const { audioBase64 } = await request.json();

    if (!audioBase64) {
      return NextResponse.json(
        { success: false, error: 'Se requiere audio' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY || request.headers.get('X-Groq-API-Key');
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key no configurada.'
      });
    }

    // Remove data URL prefix if present
    const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(cleanBase64, 'base64');
    
    // Create form data
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'es');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq ASR error:', error);
      return NextResponse.json({
        success: false,
        error: 'Error al transcribir audio.'
      });
    }

    const data = await response.json();
    const transcription = data.text;

    if (!transcription || transcription.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'No pude entender el audio. Intenta hablar más claro.'
      });
    }

    return NextResponse.json({
      success: true,
      transcription
    });
  } catch (error: any) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al transcribir el audio'
    });
  }
}
