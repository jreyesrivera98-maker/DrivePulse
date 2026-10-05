/**
 * Preguntas frecuentes. Viven como datos para poder buscarlas y filtrarlas.
 *
 *  - `a`:     párrafos de la respuesta.
 *  - `steps`: lista de pasos (opcional), para guías paso a paso.
 *  - `link`:  enlace de apoyo (opcional).
 *  - Los tokens {{campo}} se reemplazan con datos de config/legal.js.
 *
 * Mantén las respuestas alineadas con el aviso de privacidad y con lo que
 * la app hace de verdad (hooks/useSignOff.js, lib/cajaNegra.js).
 */

export const FAQ_CATEGORIES = [
  { id: "firma", label: "Firma y biometría" },
  { id: "ubicacion", label: "Ubicación" },
  { id: "registros", label: "Mis registros" },
  { id: "privacidad", label: "Privacidad y derechos" },
];

export const FAQ_ITEMS = [
  /* ---------------- Firma y biometría ---------------- */
  {
    id: "biometria-guarda",
    category: "firma",
    q: "¿DrivePulse guarda mi huella o mi rostro?",
    a: [
      "No. La verificación la hace tu dispositivo, dentro de su componente seguro. DrivePulse solo recibe una confirmación criptográfica de que se realizó; nunca tu huella, tu rostro, tu PIN ni tu patrón.",
    ],
    link: { to: "/privacidad#biometria", label: "Cómo funciona la verificación biométrica" },
  },
  {
    id: "autenticar-firmar",
    category: "firma",
    q: "¿Qué es “Autenticar y Firmar”?",
    a: [
      "Es la forma de cerrar un viaje, y reemplaza a la firma dibujada. Aceptas la declaración jurada, tu dispositivo confirma que eres tú (huella, rostro o PIN) y DrivePulse registra la hora y la ubicación del cierre.",
    ],
  },
  {
    id: "passkey-primera-vez",
    category: "firma",
    q: "¿Por qué la primera vez me pide crear una llave de acceso?",
    a: [
      "Es un paso único en cada dispositivo. Tu dispositivo crea una llave de acceso (passkey) vinculada a DrivePulse y la protege con tu huella, rostro o PIN. Las siguientes veces solo te verifica.",
      "Puedes eliminarla desde los ajustes del dispositivo; se creará otra la próxima vez que firmes.",
    ],
  },
  {
    id: "sin-biometria",
    category: "firma",
    q: "Mi celular no tiene huella ni rostro. ¿Puedo cerrar el viaje?",
    a: [
      "Sí. Si tu dispositivo tiene PIN o patrón, puede usarlo para la verificación.",
      "Si el dispositivo o el navegador no admiten la verificación, el cierre se registra como “Checkbox + Auditoría Ciega”: declaración jurada, hora y ubicación, con el motivo anotado.",
    ],
  },
  {
    id: "cancele-huella",
    category: "firma",
    q: "Cancelé la huella sin querer. ¿Qué hago?",
    a: [
      "Toca “Autenticar y Firmar” otra vez. Si no puedes usar la verificación, después de cancelar aparece la opción “Continuar con Checkbox + Auditoría Ciega”. Queda registrado que la elegiste tú.",
    ],
  },
  {
    id: "declaracion-jurada",
    category: "firma",
    q: "¿Qué significa la declaración jurada?",
    a: [
      "Al marcarla declaras, bajo protesta de decir verdad, que el kilometraje, los niveles y el reporte de daños son correctos, y que asumes la responsabilidad del vehículo.",
      "Mientras no la marques, el botón de firma permanece desactivado. Revisa tus datos antes de firmar.",
    ],
  },

  /* ---------------- Ubicación ---------------- */
  {
    id: "ubicacion-rastreo",
    category: "ubicacion",
    q: "¿DrivePulse me rastrea durante el viaje?",
    a: [
      "No. La ubicación se toma una sola vez, en el momento en que presionas “Autenticar y Firmar”, para dejar constancia de dónde se entregó o recibió el vehículo. No hay seguimiento continuo ni en segundo plano.",
    ],
  },
  {
    id: "ubicacion-obligatoria",
    category: "ubicacion",
    q: "¿Por qué es obligatoria la ubicación?",
    a: ["Porque forma parte de la constancia de entrega y recepción del vehículo. Sin ubicación no se puede cerrar el registro."],
  },
  {
    id: "ubicacion-permiso",
    category: "ubicacion",
    q: "Dice que no puede acceder a mi ubicación, pero ya la activé",
    a: ["Hay dos permisos distintos: el del sitio en tu navegador y el de ubicación de tu dispositivo. Los dos deben estar activos. Prueba en este orden:"],
    steps: [
      "Toca el candado junto a la dirección del sitio y permite “Ubicación”.",
      "Activa la ubicación del dispositivo (Ajustes › Ubicación, o Privacidad › Localización) y permite que tu navegador la use.",
      "En iPhone, revisa Ajustes › Privacidad y seguridad › Localización › Safari (o tu navegador) y elige “Al usar la app”.",
      "Abre DrivePulse directamente en tu navegador, con su dirección https://. Los navegadores integrados de otras apps (WhatsApp, correo) a veces bloquean la ubicación.",
      "Si estás en un edificio, acércate a una ventana o activa el Wi-Fi para mejorar la señal.",
      "Cierra y vuelve a abrir el navegador, y toca “Autenticar y Firmar” otra vez.",
    ],
  },
  {
    id: "ubicacion-precision",
    category: "ubicacion",
    q: "Tarda mucho en obtener mi ubicación",
    a: [
      "DrivePulse primero intenta con el GPS y, si no responde en unos segundos, usa la ubicación aproximada por red. En interiores o con poca señal puede tardar más. Se guarda también la precisión en metros.",
    ],
  },

  /* ---------------- Mis registros ---------------- */
  {
    id: "quien-ve",
    category: "registros",
    q: "¿Quién puede ver mis cierres y mi ubicación?",
    a: [
      "Las bitácoras son visibles para el personal autorizado de tu organización. El detalle de auditoría, con la ubicación y el método de firma, lo consultan los administradores.",
    ],
  },
  {
    id: "corregir-registro",
    category: "registros",
    q: "Me equivoqué en un dato después de firmar. ¿Se puede corregir?",
    a: [
      "Los cierres no se editan. Pide a un administrador que agregue una corrección: se anota sobre el registro con quién, cuándo y por qué, y el original se conserva.",
    ],
  },
  {
    id: "borrar-registros",
    category: "registros",
    q: "¿Por qué no se pueden borrar los registros?",
    a: [
      "Cada cierre genera una huella digital de integridad y se guarda en una bitácora de auditoría diseñada para no modificarse ni borrarse. Así sirve como prueba si hay un siniestro o una aclaración.",
      "Un administrador puede ocultar un registro dejando anotado el motivo.",
    ],
  },
  {
    id: "foto-ticket",
    category: "registros",
    q: "¿Qué hacen con la foto de mi ticket de gasolina?",
    a: [
      "Se guarda como comprobante del consumo. Para leer litros, monto, estación, folio y fecha, la imagen se envía a un servicio de inteligencia artificial (Anthropic) que solo devuelve esos datos; no se envían tu nombre ni otros datos de tu cuenta.",
      "Puedes revisar y corregir lo que leyó antes de guardar.",
    ],
  },
  {
    id: "fotos-personas",
    category: "registros",
    q: "¿Puedo subir fotos donde aparezcan personas?",
    a: ["Mejor evítalo. Enfoca el vehículo, el daño o el ticket, y procura que no salgan personas, placas ajenas ni documentos personales."],
  },

  /* ---------------- Privacidad y derechos ---------------- */
  {
    id: "para-que-datos",
    category: "privacidad",
    q: "¿Para qué se usan mis datos?",
    a: [
      "Para controlar la flotilla: reservas, bitácora de salida y regreso, constancia de entrega y recepción, documentación de daños, control de combustible y seguridad de la plataforma.",
      "No se usan para publicidad ni se venden.",
    ],
    link: { to: "/privacidad#finalidades", label: "Ver todas las finalidades" },
  },
  {
    id: "derechos-arco",
    category: "privacidad",
    q: "¿Cómo ejerzo mis derechos de acceso, rectificación, cancelación u oposición?",
    a: [
      "Escribe a {{correoPrivacidad}} con tu nombre completo, un medio para responderte, un documento que acredite tu identidad y una descripción clara de lo que solicitas.",
    ],
    link: { to: "/privacidad#derechos", label: "Más sobre tus derechos" },
  },
  {
    id: "queja",
    category: "privacidad",
    q: "¿Dónde presento una queja si considero que no se respetó mi derecho?",
    a: [
      "Primero con el responsable, en {{correoPrivacidad}}. También puedes acudir a la Secretaría Anticorrupción y Buen Gobierno, la autoridad en materia de protección de datos personales en posesión de particulares desde marzo de 2025.",
    ],
  },
];
