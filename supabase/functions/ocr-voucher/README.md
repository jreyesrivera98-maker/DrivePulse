# Edge Function: `ocr-voucher`

Lee de verdad el ticket de gasolina (antes era simulado con datos
aleatorios). Usa la API de Claude (Anthropic) con visión.

## Requisito: la llave de API de Anthropic

Necesitas una cuenta en [console.anthropic.com](https://console.anthropic.com),
generar una API key, y configurarla como secreto de esta función:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-tu-llave-aqui
```

**Importante:** esta es una llave de API de pago (por uso) — cada
lectura de ticket consume tokens de la API de Anthropic. Para el
volumen de una flotilla normal (unas cuantas recargas al día), el
costo es mínimo, pero no es gratis indefinidamente. Puedes ver tu
consumo y poner límites de gasto en el dashboard de Anthropic.

## Desplegar

```bash
supabase functions deploy ocr-voucher
```

## Qué hace

1. Recibe la URL de una foto ya subida a Storage (bucket
   `fuel-vouchers` o `evidence-photos`).
2. La descarga y la manda a Claude pidiendo un JSON con: litros,
   monto, estación, folio, fecha del ticket, y qué tan seguro está el
   modelo de la lectura (Alta/Media/Baja).
3. Si el modelo no puede leer un campo con confianza, regresa `null`
   para ese campo en vez de inventar un valor — el frontend deja esos
   campos vacíos para que la persona los complete a mano.

## Si algo sale mal

- Si `ANTHROPIC_API_KEY` no está configurada, la función responde con
  error 500 explicando exactamente eso — no falla en silencio.
- Si el ticket está demasiado borroso o Claude no puede interpretar
  la respuesta como JSON, se le pide a la persona que capture los
  datos manualmente (el botón "Captura manual" ya existente sigue
  disponible como respaldo).
