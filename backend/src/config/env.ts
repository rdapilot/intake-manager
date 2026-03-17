import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL,
  huggingFaceApiKey: process.env.HUGGING_FACE_API_KEY,
  ocrProviderUrl: process.env.OCR_PROVIDER_URL,
  registrarApiUrl: process.env.REGISTRAR_API_URL
};
