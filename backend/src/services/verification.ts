import { env } from '../config/env.js';
import { VerificationResult } from '../types/domain.js';

export const simulateVerification = async (supplierName: string): Promise<VerificationResult> => {
  const hasRegistrar = Boolean(env.registrarApiUrl);
  const hasOcr = Boolean(env.ocrProviderUrl);
  const hasAiProof = Boolean(env.huggingFaceApiKey);

  return {
    registrarValidated: hasRegistrar || supplierName.length > 3,
    aiProofValidated: hasAiProof,
    ocrExtracted: hasOcr,
    notes: [
      hasRegistrar ? 'Registrar endpoint configured and ready.' : 'Registrar API not configured yet. Using placeholder supplier confidence.',
      hasAiProof ? 'Hugging Face proving key detected.' : 'AI proof validation is currently simulated until an API key is added.',
      hasOcr ? 'OCR provider configured for supplier document extraction.' : 'OCR provider URL not configured.'
    ]
  };
};
