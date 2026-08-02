import { Component } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Sin esto, cualquier error de JavaScript no controlado en el árbol
 * de React deja la pantalla completamente en blanco, sin ninguna
 * pista de qué pasó (como el error de canales de Realtime duplicados
 * que causó esto la primera vez). Con el Error Boundary, al menos se
 * ve un mensaje y el error queda visible en consola para diagnosticar.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("DrivePulse — error no controlado:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dp-surface flex items-center justify-center p-6">
          <div className="max-w-md text-center bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={22} />
            </div>
            <h1 className="text-lg font-bold text-slate-900 mb-1">Ocurrió un error inesperado</h1>
            <p className="text-sm text-slate-500 mb-5">
              Intenta recargar la página. Si el problema persiste, revisa la consola del navegador (F12) para más detalles.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-dp-black hover:bg-[#161d30] text-white rounded-lg px-4 py-2.5 text-sm font-semibold"
            >
              <RotateCw size={14} /> Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
