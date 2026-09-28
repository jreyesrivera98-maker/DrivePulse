// supabase/functions/ocr-voucher/index.ts
//
// OCR REAL de vouchers de combustible, usando la API de Claude
// (Anthropic) con visión: recibe la URL de una foto ya subida a
// Storage, la descarga, y le pide al modelo que extraiga litros,
// monto, estación, folio y fecha del ticket en JSON estructurado.
//
// Por qué un modelo de visión y no OCR tradicional + reglas fijas:
// los tickets de gasolina mexicanos varían muchísimo de formato
// (Pemex, Shell, Oxxo Gas, cada estación distinta) y la calidad de
// foto de un celular en campo es irregular — un modelo de visión
// generaliza mucho mejor que un motor de OCR + regex fijos para este
// caso de uso semi-estructurado.
//
// Requiere el secreto ANTHROPIC_API_KEY:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Despliegue:
//   supabase functions deploy ocr-voucher

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const VALID_CONFIDENCE = ["Alta", "Media", "Baja"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB — límite razonable para una foto de ticket

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido. Usa POST." }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Falta el encabezado Authorization." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) {
      return json(
        { error: "El OCR todavía no está configurado en el servidor (falta ANTHROPIC_API_KEY)." },
        500
      );
    }

    // ------------------------------------------------------------------
    // 1) Verificar que quien llama tiene sesión válida (cualquier
    //    colaborador autenticado puede usar el OCR de su propio
    //    voucher, igual que ya podía adjuntarlo).
    // ------------------------------------------------------------------
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();
    if (userError || !user) return json({ error: "Sesión inválida o expirada." }, 401);

    // ------------------------------------------------------------------
    // 2) Validar el cuerpo de la petición.
    // ------------------------------------------------------------------
    const body = await req.json().catch(() => null);
    const { imageUrl } = body ?? {};
    if (!imageUrl || typeof imageUrl !== "string") {
      return json({ error: "Falta imageUrl." }, 400);
    }

    // ------------------------------------------------------------------
    // 3) Descargar la imagen (viene de una URL firmada de Storage) y
    //    convertirla a base64 para mandarla a la API de Claude.
    // ------------------------------------------------------------------
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return json({ error: "No se pudo descargar la imagen del voucher." }, 400);
    }
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return json({ error: "El archivo no parece ser una imagen válida." }, 400);
    }

    const buf = new Uint8Array(await imgRes.arrayBuffer());
    if (buf.byteLength > MAX_IMAGE_BYTES) {
      return json({ error: "La imagen es demasiado grande para procesarla (máximo 8MB)." }, 400);
    }

    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < buf.length; i += chunkSize) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);

    // ------------------------------------------------------------------
    // 4) Pedirle a Claude que extraiga los datos en JSON estructurado.
    // ------------------------------------------------------------------
    const prompt = `Eres un asistente que extrae datos de tickets/vouchers de gasolina mexicanos (Pemex, Shell, Oxxo Gas, BP, Arco, etc.).

Analiza la imagen adjunta y responde ÚNICAMENTE con un objeto JSON válido (sin texto adicional, sin explicación, sin markdown ni bloques de código) con exactamente estas claves:

{
  "litros": number o null,
  "monto": number o null,
  "estacion": string o null,
  "folio": string o null,
  "fecha_ticket": string o null,
  "confidence": "Alta", "Media" o "Baja"
}

Reglas:
- "fecha_ticket" debe ir en formato "YYYY-MM-DDTHH:mm" (ISO 8601, 24 horas). Si el ticket no muestra hora, usa "00:00".
- "monto" es el total pagado en pesos, como número (sin símbolo de $, sin comas).
- "litros" como número con hasta 3 decimales.
- Si un campo no aparece en el ticket o no se puede leer con confianza, usa null para ese campo específico — NUNCA inventes un valor.
- "confidence" refleja qué tan seguro estás de la lectura en general: "Alta" si el ticket es claro y todos los campos son legibles, "Media" si hay ambigüedad en uno o más campos, "Baja" si la imagen está borrosa/incompleta y adivinaste varios valores.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: contentType, data: base64 } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return json({ error: "El servicio de OCR no respondió correctamente. Intenta de nuevo o captura manualmente." }, 502);
    }

    const anthropicData = await anthropicRes.json();
    const textBlock = anthropicData.content?.find((c: any) => c.type === "text")?.text ?? "";

    let parsed: any;
    try {
      const cleaned = textBlock.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (_e) {
      console.error("No se pudo interpretar la respuesta del modelo:", textBlock);
      return json({ error: "No se pudieron interpretar los datos del ticket. Captura los campos manualmente." }, 502);
    }

    return json(
      {
        litros: typeof parsed.litros === "number" ? parsed.litros : null,
        monto: typeof parsed.monto === "number" ? parsed.monto : null,
        estacion: parsed.estacion || null,
        folio: parsed.folio || null,
        fecha_ticket: parsed.fecha_ticket || null,
        confidence: VALID_CONFIDENCE.includes(parsed.confidence) ? parsed.confidence : "Media",
      },
      200
    );
  } catch (err) {
    console.error("ocr-voucher error:", err);
    return json({ error: err instanceof Error ? err.message : "Error inesperado." }, 500);
  }
});
