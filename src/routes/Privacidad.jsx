import { Link } from "react-router-dom";
import { AlertTriangle, Check, Lock, X } from "lucide-react";
import LegalLayout from "../components/legal/LegalLayout";
import { LegalValue } from "../components/legal/LegalValue";
import { LEGAL, legalIncomplete } from "../config/legal";

/*
 * Aviso de privacidad (México · Ley Federal de Protección de Datos Personales
 * en Posesión de los Particulares, vigente desde el 21 de marzo de 2025; la
 * autoridad es la Secretaría Anticorrupción y Buen Gobierno).
 *
 * El texto describe lo que DrivePulse hace realmente (ver migración 0022,
 * hooks/useSignOff.js y la función ocr-voucher). Si cambia el producto,
 * cambia este aviso. Debe ser revisado por asesoría legal antes de publicarse.
 */

const P = ({ children, className = "" }) => <p className={`text-[15px] leading-7 text-slate-600 ${className}`}>{children}</p>;

const UL = ({ children }) => (
  <ul className="space-y-2 pl-5 text-[15px] leading-7 text-slate-600 [&>li]:list-disc [&>li]:marker:text-slate-300">{children}</ul>
);

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-slate-200 pt-8 first:border-t-0 first:pt-0">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
      <div className="max-w-[68ch] space-y-3">{children}</div>
    </section>
  );
}

/** Fila de la tabla de datos tratados. */
function DataRow({ label, children }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[11rem_1fr] sm:gap-6">
      <dt className="text-sm font-semibold text-slate-800">{label}</dt>
      <dd className="text-[15px] leading-7 text-slate-600">{children}</dd>
    </div>
  );
}

const SECTIONS = [
  { id: "responsable", title: "Quién es el responsable" },
  { id: "datos", title: "Qué datos tratamos" },
  { id: "biometria", title: "Cómo funciona la verificación biométrica" },
  { id: "ubicacion", title: "Cuándo se toma tu ubicación" },
  { id: "finalidades", title: "Para qué usamos tus datos" },
  { id: "terceros", title: "Quién más interviene" },
  { id: "conservacion", title: "Cuánto tiempo los conservamos" },
  { id: "derechos", title: "Tus derechos y cómo ejercerlos" },
  { id: "seguridad", title: "Cómo los protegemos" },
  { id: "cambios", title: "Cambios a este aviso" },
];

function TableOfContents() {
  return (
    <ol className="space-y-1 text-sm">
      {SECTIONS.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="flex gap-2 rounded-md px-2 py-1.5 text-slate-500 hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
            <span className="w-4 shrink-0 text-right text-slate-300">{i + 1}</span>
            {s.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

function PendingNotice() {
  return (
    <div role="alert" className="mb-8 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">Faltan datos del responsable</p>
        <p className="mt-1 leading-relaxed">
          Los datos resaltados en ámbar son marcadores. Complétalos en <code className="rounded bg-amber-100 px-1">src/config/legal.js</code> y haz
          revisar el texto con tu asesor legal antes de publicar este aviso.
        </p>
      </div>
    </div>
  );
}

/** El elemento central: lo que se guarda frente a lo que nunca sale del dispositivo. */
function QueSeGuarda() {
  return (
    <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-2">
      <div className="p-5 sm:p-6">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-teal-700">
          <Check size={16} /> Lo que sí se guarda al cerrar un viaje
        </p>
        <ul className="space-y-2 text-[15px] leading-6 text-slate-700">
          <li>La fecha y la hora exactas del cierre.</li>
          <li>La ubicación GPS de ese instante, y nada más.</li>
          <li>Si firmaste con biometría o con “Auditoría Ciega”.</li>
          <li>Que aceptaste la declaración jurada.</li>
          <li>Una confirmación criptográfica de tu dispositivo (no es tu huella).</li>
        </ul>
      </div>
      <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-6 md:border-l md:border-t-0">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Lock size={15} /> Lo que nunca llega a {LEGAL.plataforma}
        </p>
        <ul className="space-y-2 text-[15px] leading-6 text-slate-600">
          <li className="flex gap-2"><X size={16} className="mt-1 shrink-0 text-slate-400" /> Tu huella dactilar.</li>
          <li className="flex gap-2"><X size={16} className="mt-1 shrink-0 text-slate-400" /> La imagen o el mapa de tu rostro.</li>
          <li className="flex gap-2"><X size={16} className="mt-1 shrink-0 text-slate-400" /> El PIN o patrón de tu dispositivo.</li>
          <li className="flex gap-2"><X size={16} className="mt-1 shrink-0 text-slate-400" /> Dónde estás fuera del momento del cierre.</li>
        </ul>
      </div>
    </div>
  );
}

export default function Privacidad() {
  return (
    <LegalLayout
      title="Aviso de privacidad"
      description="Qué datos personales recabamos en DrivePulse, para qué los usamos y cómo puedes ejercer tus derechos."
    >
      {legalIncomplete && <PendingNotice />}

      <QueSeGuarda />

      <p className="mt-4 max-w-[68ch] text-sm leading-6 text-slate-500">
        Esto es un resumen. El aviso completo está abajo; si algo del resumen y del aviso completo difiere, aplica el aviso completo.
      </p>

      <div className="mt-10 lg:grid lg:grid-cols-[13rem_1fr] lg:gap-12">
        <aside className="mb-8 lg:mb-0">
          <details className="rounded-xl border border-slate-200 bg-white p-3 lg:hidden">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">En esta página</summary>
            <div className="mt-2">
              <TableOfContents />
            </div>
          </details>
          <nav aria-label="En esta página" className="sticky top-20 hidden lg:block">
            <p className="mb-2 px-2 text-xs font-semibold text-slate-400">En esta página</p>
            <TableOfContents />
          </nav>
        </aside>

        <div className="min-w-0 space-y-10">
          <Section id="responsable" title="1. Quién es el responsable">
            <P>
              <LegalValue field="responsable" />, con domicilio en <LegalValue field="domicilio" />, es el responsable del tratamiento de tus datos
              personales.
            </P>
            <P>
              {LEGAL.plataforma} es la plataforma de gestión de flotilla vehicular, desarrollada por {LEGAL.desarrollador}, que el responsable utiliza para
              reservar vehículos y llevar su bitácora. Para cualquier asunto sobre tus datos, escribe a <LegalValue field="correoPrivacidad" />.
            </P>
          </Section>

          <Section id="datos" title="2. Qué datos tratamos">
            <dl className="rounded-xl border border-slate-200 bg-white px-5">
              <DataRow label="Tu cuenta">
                Nombre, correo electrónico, área, rol (administrador o trabajador) y estatus de la cuenta. Tu contraseña la protege el proveedor de
                autenticación; no podemos verla.
              </DataRow>
              <DataRow label="Uso de vehículos">
                Reservas (fechas y horarios), proyecto, destino, persona que autoriza, kilometraje inicial y final, nivel de combustible, limpieza,
                incidencias y reporte de daños.
              </DataRow>
              <DataRow label="Fotografías">
                Fotos de incidencias y daños, y de los comprobantes de combustible. Procura que no aparezcan personas ni documentos personales.
              </DataRow>
              <DataRow label="Comprobantes de combustible">Litros, monto, estación, folio y fecha del ticket.</DataRow>
              <DataRow label="Cierre y auditoría">
                Al entregar o recibir un vehículo: fecha y hora (del dispositivo y del servidor), coordenadas GPS y su precisión, método de firma
                (biométrica o “Checkbox + Auditoría Ciega”), aceptación de la declaración jurada, tipo de navegador y dispositivo, la evidencia
                criptográfica de la verificación y una huella digital de integridad del registro.
              </DataRow>
            </dl>
            <P>
              <strong className="font-semibold text-slate-800">Datos sensibles.</strong> No recabamos datos personales sensibles. En particular, no
              recibimos ni almacenamos huellas dactilares, imágenes del rostro ni plantillas biométricas (ver la sección 3).
            </P>
          </Section>

          <Section id="biometria" title="3. Cómo funciona la verificación biométrica">
            <P>
              Al cerrar un viaje, {LEGAL.plataforma} le pide a tu dispositivo que confirme que eres tú, usando el estándar WebAuthn (llaves de acceso
              o <em>passkeys</em>): huella, rostro o el PIN o patrón del propio dispositivo.
            </P>
            <P>
              Esa comprobación ocurre dentro de tu dispositivo, en su componente seguro. {LEGAL.plataforma} solo recibe la confirmación criptográfica
              de que la verificación se realizó: un identificador de la credencial, su llave pública y una firma. Con eso no es posible reconstruir tu
              huella ni tu rostro.
            </P>
            <P>
              La primera vez en cada dispositivo se crea una llave de acceso vinculada a {LEGAL.plataforma}. Puedes eliminarla cuando quieras desde los
              ajustes del dispositivo.
            </P>
            <P>
              Si el dispositivo o el navegador no admiten la verificación, el cierre se registra como “Checkbox + Auditoría Ciega”: declaración
              jurada, hora y ubicación, con el motivo anotado.
            </P>
          </Section>

          <Section id="ubicacion" title="4. Cuándo se toma tu ubicación">
            <P>
              Solo se captura en el instante en que presionas “Autenticar y Firmar”, al entregar (check-out) o recibir (check-in) un vehículo. No hay
              seguimiento continuo ni en segundo plano.
            </P>
            <P>
              La ubicación es obligatoria para cerrar el registro, porque forma parte de la constancia de dónde se entregó o recibió el vehículo. El
              permiso lo administras tú desde el navegador y los ajustes de tu dispositivo.{" "}
              <Link to="/preguntas-frecuentes#ubicacion-permiso" className="font-medium text-teal-700 underline underline-offset-2">
                ¿Problemas con el permiso?
              </Link>
            </P>
          </Section>

          <Section id="finalidades" title="5. Para qué usamos tus datos">
            <P>Usamos tus datos únicamente para las siguientes finalidades, todas necesarias para operar el control de la flotilla:</P>
            <UL>
              <li>Crear y administrar tu cuenta y tus permisos.</li>
              <li>Reservar vehículos y llevar la bitácora de salida y regreso.</li>
              <li>Dejar constancia verificable de quién tenía el vehículo, cuándo y dónde se entregó o recibió, y bajo qué declaración.</li>
              <li>Documentar daños, incidencias y siniestros, y deslindar responsabilidades.</li>
              <li>Controlar el consumo de combustible y su comprobación.</li>
              <li>Mantener la seguridad de la plataforma, prevenir fraudes y atender aclaraciones.</li>
              <li>Elaborar indicadores y reportes internos de la flotilla.</li>
            </UL>
            <P>
              No usamos tus datos para publicidad ni los vendemos. No tratamos tus datos para finalidades que requieran un consentimiento adicional;
              si eso cambiara, te lo pediremos antes.
            </P>
          </Section>

          <Section id="terceros" title="6. Quién más interviene">
            <P>
              <strong className="font-semibold text-slate-800">Personal de tu organización.</strong> Las bitácoras son visibles para el personal
              autorizado. El detalle de auditoría, con la ubicación y el método de firma, lo consultan los administradores.
            </P>
            <P>
              <strong className="font-semibold text-slate-800">Proveedores tecnológicos.</strong> Tratan datos por cuenta del responsable, solo para
              prestar el servicio:
            </P>
            <UL>
              <li>Supabase: base de datos, autenticación, almacenamiento de archivos y funciones del servidor.</li>
              <li>El proveedor de alojamiento de la aplicación web.</li>
              <li>
                Anthropic (servicio de inteligencia artificial): al subir un comprobante de combustible, la imagen del ticket se envía para leer
                litros, monto, estación, folio y fecha. No se envían tu nombre ni otros datos de tu cuenta.
              </li>
            </UL>
            <P>También podremos compartir datos con autoridades cuando exista un mandato legal.</P>
          </Section>

          <Section id="conservacion" title="7. Cuánto tiempo los conservamos">
            <P>
              Conservamos tus datos mientras tu cuenta esté activa y durante <LegalValue field="plazoConservacion" /> después, o el tiempo que la ley
              exija.
            </P>
            <P>
              Los registros de bitácora y de auditoría están diseñados para no poder modificarse ni borrarse: cada cierre genera una huella digital
              de integridad. Por eso sirven como prueba ante un siniestro o una aclaración. Las rectificaciones se agregan como correcciones con
              rastro (quién, cuándo y por qué) sin sustituir el registro original, y un administrador puede ocultar un registro dejando anotado el
              motivo.
            </P>
          </Section>

          <Section id="derechos" title="8. Tus derechos y cómo ejercerlos">
            <P>
              Puedes solicitar el acceso a tus datos, su rectificación, su cancelación y oponerte a su tratamiento (derechos ARCO), así como revocar
              tu consentimiento cuando aplique.
            </P>
            <P>
              Envía tu solicitud a <LegalValue field="correoPrivacidad" /> indicando tu nombre completo, un medio para responderte, un documento
              que acredite tu identidad y una descripción clara de los datos y del derecho que quieres ejercer. Responderemos en los plazos que
              marca la ley.
            </P>
            <P>
              Cuando existan registros que deban conservarse por obligación legal o para acreditar responsabilidades, la cancelación se atenderá
              conforme a la ley, bloqueando esos datos para que no se usen para otro fin.
            </P>
            <P>
              Si consideras que tu derecho no fue atendido, puedes acudir a la Secretaría Anticorrupción y Buen Gobierno, autoridad en materia de
              protección de datos personales en posesión de particulares.
            </P>
          </Section>

          <Section id="seguridad" title="9. Cómo los protegemos">
            <P>
              Aplicamos medidas administrativas, técnicas y físicas razonables: conexión cifrada (HTTPS), separación de los datos de cada organización,
              control de acceso por rol y registros de auditoría con huella de integridad.
            </P>
          </Section>

          <Section id="cambios" title="10. Cambios a este aviso">
            <P>
              Publicaremos cualquier cambio en esta página, con la nueva versión y fecha. Esta es la versión {LEGAL.version}, del{" "}
              {LEGAL.ultimaActualizacion}. Si cambian las finalidades del tratamiento, te pediremos de nuevo tu consentimiento.
            </P>
            <P>
              ¿Tienes dudas? Revisa las{" "}
              <Link to="/preguntas-frecuentes" className="font-medium text-teal-700 underline underline-offset-2">
                preguntas frecuentes
              </Link>
              .
            </P>
          </Section>
        </div>
      </div>
    </LegalLayout>
  );
}
