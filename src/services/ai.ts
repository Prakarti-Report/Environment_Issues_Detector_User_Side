import type { ReportStatus } from './reports';
import {
  AI_API_URL,
  AI_BASE_URL,
  AI_PROD_URL,
  isLocalHost,
  AI_FALLBACK_TO_PROD,
} from '../config/env';

export { AI_API_URL, AI_BASE_URL };

if (import.meta.env.DEV) {
  console.info('[AI] using', AI_API_URL);
}

export const warmUpAi = () =>
  fetch(AI_BASE_URL, { method: 'GET', mode: 'no-cors' }).catch(() => {});

export interface NormalizedAiReport {
  category: string;
  description: string;
  ai_category: string;
  ai_confidence: number | null;
  ai_description: string;
  severity: 'low' | 'medium' | 'high';
  status: ReportStatus;
  evidence: string[];
  pollution_detected: boolean;
}

/**
 * Normalizes raw API response from pollution detection endpoint into
 * clean, complete report fields.
 */
export const normalizeAiResponse = (data: any): NormalizedAiReport => {
  const result = data?.result || data || {};
  
  const pollutionDetected = result.pollution_detected ?? (
    Array.isArray(result.pollution_types) && result.pollution_types.length > 0
  );

  const pollutionTypes: string[] = Array.isArray(result.pollution_types)
    ? result.pollution_types
    : result.pollution_type
    ? [result.pollution_type]
    : [];

  // Derive Category Title
  let category = 'Environmental Hazard';
  if (pollutionTypes.length > 0) {
    category = pollutionTypes.join(' & ');
  } else if (result.pollution_detected === false) {
    category = 'No Pollution Detected';
  } else if (data.category && data.category !== 'pending_ai') {
    category = data.category;
  } else if (data.label && data.label !== 'pending_ai') {
    category = data.label;
  }

  // Derive AI Category tag
  const aiCategory = pollutionTypes.length > 0
    ? pollutionTypes.join(', ')
    : category;

  // Derive Confidence (must be double precision number for PostgreSQL)
  let confidence: number | null = null;
  const rawConf = result.confidence ?? data.confidence;
  if (typeof rawConf === 'number') {
    confidence = rawConf > 1 ? Number((rawConf / 100).toFixed(2)) : Number(rawConf.toFixed(2));
  } else if (typeof rawConf === 'string') {
    const lower = rawConf.toLowerCase().trim();
    if (lower === 'high') confidence = 0.95;
    else if (lower === 'medium') confidence = 0.75;
    else if (lower === 'low') confidence = 0.45;
    else {
      const parsed = parseFloat(lower);
      if (!isNaN(parsed)) {
        confidence = parsed > 1 ? Number((parsed / 100).toFixed(2)) : Number(parsed.toFixed(2));
      } else {
        confidence = 0.90;
      }
    }
  } else if (pollutionDetected) {
    confidence = 0.90;
  }

  // Derive Evidence array
  const evidence: string[] = Array.isArray(result.evidence)
    ? result.evidence.filter((e: any) => typeof e === 'string' && e.trim().length > 0)
    : [];

  // Derive Description
  const rawDescription = result.description || data.description || (
    pollutionDetected
      ? `Identified ${category} in the submitted image.`
      : 'No pollution detected in the submitted image.'
  );

  let fullDescription = rawDescription;
  if (evidence.length > 0 && !rawDescription.includes(evidence[0])) {
    fullDescription = `${rawDescription}\n\nKey Observations:\n• ${evidence.join('\n• ')}`;
  }

  // Derive Severity
  let severity: 'low' | 'medium' | 'high' = 'medium';
  if (result.severity && ['low', 'medium', 'high'].includes(result.severity.toLowerCase())) {
    severity = result.severity.toLowerCase() as 'low' | 'medium' | 'high';
  } else if (!pollutionDetected) {
    severity = 'low';
  } else {
    const isHighConf = (confidence ?? 0) >= 0.85;
    const isMultipleHazards = pollutionTypes.length >= 2;
    const hasMultipleEvidence = evidence.length >= 2;
    if (isHighConf && (isMultipleHazards || hasMultipleEvidence)) {
      severity = 'high';
    } else if (isHighConf || isMultipleHazards) {
      severity = 'high';
    } else {
      severity = 'medium';
    }
  }

  return {
    category,
    description: fullDescription,
    ai_category: aiCategory,
    ai_confidence: confidence,
    ai_description: rawDescription,
    severity,
    status: 'ai_analyzed',
    evidence,
    pollution_detected: Boolean(pollutionDetected),
  };
};

const createFormData = (file: File | Blob) => {
  const formData = new FormData();
  formData.append('file', file, file instanceof File ? file.name : 'report_image.jpg');
  return formData;
};

const postWithTimeout = async (url: string, file: File | Blob, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: createFormData(file),
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
};

const isRetryableStatus = (status: number) => status === 502 || status === 503 || status === 504;

const executeRequest = async (url: string, file: File | Blob, timeoutMs: number) => {
  try {
    const res = await postWithTimeout(url, file, timeoutMs);
    return { ok: true as const, response: res, networkError: null };
  } catch (err: any) {
    return { ok: false as const, response: null, networkError: err };
  }
};

/**
 * Sends an image file/blob to the Pollution Detection AI endpoint with timeouts,
 * retries, and fallback handling.
 */
export const detectPollution = async (file: File | Blob): Promise<NormalizedAiReport> => {
  const primaryUrl = AI_API_URL;
  const primaryTimeout = isLocalHost ? 20000 : 90000;

  let result = await executeRequest(primaryUrl, file, primaryTimeout);

  if (result.networkError) {
    if (isLocalHost && AI_FALLBACK_TO_PROD) {
      console.warn('[AI] Local AI server network error; falling back to Render AI URL...');
      result = await executeRequest(AI_PROD_URL, file, 90000);
      if (result.networkError || (result.response && isRetryableStatus(result.response.status))) {
        result = await executeRequest(AI_PROD_URL, file, 90000);
      }
    } else {
      result = await executeRequest(primaryUrl, file, primaryTimeout);
    }
  } else if (result.response && isRetryableStatus(result.response.status)) {
    result = await executeRequest(primaryUrl, file, primaryTimeout);
  }

  if (result.networkError) {
    throw new Error(
      result.networkError.name === 'AbortError'
        ? `AI detection timed out after ${primaryTimeout / 1000}s`
        : `AI detection failed due to network error: ${result.networkError.message || result.networkError}`
    );
  }

  const response = result.response!;
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`AI API returned status ${response.status}: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  return normalizeAiResponse(data);
};

/**
 * Fetches an image from a URL and runs AI pollution detection.
 */
export const detectPollutionFromUrl = async (imageUrl: string): Promise<NormalizedAiReport> => {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
  }
  const blob = await imageResponse.blob();
  const file = new File([blob], 'report_image.jpg', { type: blob.type || 'image/jpeg' });
  return detectPollution(file);
};
