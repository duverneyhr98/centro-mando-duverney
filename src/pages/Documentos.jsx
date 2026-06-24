import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Folder, FileText, Image, Plus, Trash2, Upload, ChevronLeft, Download } from "lucide-react";

export default function Documentos() {
  const [carpetas, setCarpetas] = useState([]);
  const [carpetaActiva, setCarpetaActiva] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevaCarpeta, setNuevaCarpeta] = useState("");
  const [nuevaDesc, setNuevaDesc] = useState("");
  const [mostrarFormCarpeta, setMostrarFormCarpeta] = useState(false);
  const [observacion, setObservacion] = useState("");
  const [nombreDoc, setNombreDoc] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [mostrarFormDoc, setMostrarFormDoc] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => { fetchCarpetas(); }, []);
  useEffect(() => { if (carpetaActiva) fetchDocumentos(carpetaActiva.id); }, [carpetaActiva]);

  async function fetchCarpetas() {
    setLoading(true);
    const { data } = await supabase.from("carpetas").select("*").order("created_at", { ascending: false });
    setCarpetas(data || []);
    setLoading(false);
  }

  async function fetchDocumentos(carpetaId) {
    const { data } = await supabase.from("documentos").select("*").eq("carpeta_id", carpetaId).order("created_at", { ascending: false });
    setDocumentos(data || []);
  }

  async function crearCarpeta() {
    if (!nuevaCarpeta.trim()) return;
    await supabase.from("carpetas").insert([{ nombre: nuevaCarpeta, descripcion: nuevaDesc }]);
    setNuevaCarpeta(""); setNuevaDesc(""); setMostrarFormCarpeta(false);
    fetchCarpetas();
  }

  async function eliminarCarpeta(id) {
    if (!confirm("¿Eliminar esta carpeta y todos sus documentos?")) return;
    await supabase.from("carpetas").delete().eq("id", id);
    fetchCarpetas();
  }

  async function subirDocumento() {
    if (!nombreDoc.trim() || subiendo) return;
    setSubiendo(true);

    let url = null;
    let tipo = "nota";

    if (archivo) {
      const ext = archivo.name.split(".").pop();
      const path = `${carpetaActiva.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("documentos").upload(path, archivo);
      if (!error) {
        const { data } = supabase.storage.from("documentos").getPublicUrl(path);
        url = data.publicUrl;
        tipo = archivo.type.includes("image") ? "imagen" : "pdf";
      }
    }

    await supabase.from("documentos").insert([{
      carpeta_id: carpetaActiva.id,
      nombre: nombreDoc,
      tipo,
      url,
      observacion,
    }]);

    setNombreDoc(""); setObservacion(""); setArchivo(null); setMostrarFormDoc(false);
    fetchDocumentos(carpetaActiva.id);
    setSubiendo(false);
  }

  async function eliminarDocumento(doc) {
    if (doc.url) {
      const path = doc.url.split("/documentos/")[1];
      await supabase.storage.from("documentos").remove([path]);
    }
    await supabase.from("documentos").delete().eq("id", doc.id);
    fetchDocumentos(carpetaActiva.id);
  }

  async function exportarPDF() {
    setExportando(true);
    try {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      document.head.appendChild(script);
      await new Promise((res) => { script.onload = res; });

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = 20;

      // Título de la carpeta
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 30);
      pdf.text(carpetaActiva.nombre, margin, y);
      y += 8;

      if (carpetaActiva.descripcion) {
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(120, 120, 120);
        pdf.text(carpetaActiva.descripcion, margin, y);
        y += 6;
      }

      pdf.setFontSize(9);
      pdf.setTextColor(160, 160, 160);
      pdf.text(`Exportado el ${new Date().toLocaleDateString("es-CO")}`, margin, y);
      y += 10;

      // Línea separadora
      pdf.setDrawColor(220, 220, 220);
      pdf.line(margin, y, pageW - margin, y);
      y += 10;

      // Documentos
      for (const doc of documentos) {
        if (y > 250) { pdf.addPage(); y = 20; }

        // Nombre del documento
        pdf.setFontSize(13);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(30, 30, 30);
        pdf.text(doc.nombre, margin, y);
        y += 6;

        // Tipo y fecha
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(150, 150, 150);
        const tipoLabel = doc.tipo === "imagen" ? "Imagen" : doc.tipo === "pdf" ? "Archivo PDF" : "Nota";
        pdf.text(`${tipoLabel}  |  ${new Date(doc.created_at).toLocaleDateString("es-CO")}`, margin, y);
        y += 6;

        // Observación
        if (doc.observacion) {
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(80, 80, 80);
          const lines = pdf.splitTextToSize(doc.observacion, contentW);
          pdf.text(lines, margin, y);
          y += lines.length * 5 + 2;
        }

        // Imagen
        if (doc.url && doc.tipo === "imagen") {
          try {
            const imgData = await fetchImageAsBase64(doc.url);
            const imgProps = pdf.getImageProperties(imgData);
            const imgH = (imgProps.height * contentW) / imgProps.width;
            const maxH = 80;
            const finalH = Math.min(imgH, maxH);
            const finalW = (finalH / imgH) * contentW;

            if (y + finalH > 270) { pdf.addPage(); y = 20; }
            pdf.addImage(imgData, "JPEG", margin, y, finalW, finalH);
            y += finalH + 6;
          } catch (e) {
            pdf.setFontSize(9);
            pdf.setTextColor(200, 100, 100);
            pdf.text("(No se pudo cargar la imagen)", margin, y);
            y += 6;
          }
        }

        // Separador entre documentos
        pdf.setDrawColor(235, 235, 235);
        pdf.line(margin, y, pageW - margin, y);
        y += 8;
      }

      pdf.save(`${carpetaActiva.nombre}.pdf`);
    } catch (e) {
      alert("Error al exportar. Intenta de nuevo.");
    }
    setExportando(false);
  }

  async function fetchImageAsBase64(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  if (carpetaActiva) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { setCarpetaActiva(null); setDocumentos([]); setMostrarFormDoc(false); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <ChevronLeft size={16} /> Volver a carpetas
          </button>
          <button
            onClick={exportarPDF}
            disabled={exportando || documentos.length === 0}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40"
          >
            <Download size={16} /> {exportando ? "Generando PDF..." : "Exportar como PDF"}
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">{carpetaActiva.nombre}</h1>
        {carpetaActiva.descripcion && <p className="text-gray-500 mb-4">{carpetaActiva.descripcion}</p>}

        <button onClick={() => setMostrarFormDoc(!mostrarFormDoc)} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm mb-6">
          <Plus size={16} /> Agregar documento o nota
        </button>

        {mostrarFormDoc && (
          <div className="bg-white rounded-xl shadow p-4 mb-6 space-y-3">
            <input type="text" placeholder="Nombre del documento" value={nombreDoc} onChange={(e) => setNombreDoc(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            <textarea placeholder="Observación o nota (opcional)" value={observacion} onChange={(e) => setObservacion(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2" />
            <div>
              <p className="text-sm text-gray-500 mb-1">Archivo (PDF o imagen) — opcional</p>
              <input type="file" accept=".pdf,image/*" onChange={(e) => setArchivo(e.target.files[0])} className="w-full text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={subirDocumento} disabled={subiendo} className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm disabled:opacity-50">
                {subiendo ? "Subiendo..." : "Guardar"}
              </button>
              <button onClick={() => setMostrarFormDoc(false)} className="text-gray-500 text-sm">Cancelar</button>
            </div>
          </div>
        )}

        {documentos.length === 0 ? (
          <p className="text-gray-400 text-sm">Esta carpeta está vacía. Agrega tu primer documento.</p>
        ) : (
          <div className="space-y-3">
            {documentos.map(doc => (
              <div key={doc.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {doc.tipo === "imagen" ? <Image size={18} className="text-blue-500" /> : doc.tipo === "pdf" ? <FileText size={18} className="text-red-500" /> : <FileText size={18} className="text-gray-400" />}
                    <p className="font-medium text-gray-800">{doc.nombre}</p>
                  </div>
                  <button onClick={() => eliminarDocumento(doc)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>

                {doc.observacion && <p className="text-sm text-gray-600 mb-2">{doc.observacion}</p>}

                {doc.url && doc.tipo === "imagen" && (
                  <img src={doc.url} alt={doc.nombre} className="w-full rounded-lg mt-2 max-h-64 object-cover cursor-pointer" onClick={() => window.open(doc.url, "_blank")} />
                )}

                {doc.url && doc.tipo !== "imagen" && (
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-2">
                    <Upload size={14} /> Ver / Descargar archivo
                  </a>
                )}

                <p className="text-xs text-gray-400 mt-2">{new Date(doc.created_at).toLocaleDateString("es-CO")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Mis Documentos</h1>
      <p className="text-gray-500 mb-6">Carpetas para organizar tus archivos importantes</p>

      <button onClick={() => setMostrarFormCarpeta(!mostrarFormCarpeta)} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm mb-6">
        <Plus size={16} /> Nueva carpeta
      </button>

      {mostrarFormCarpeta && (
        <div className="bg-white rounded-xl shadow p-4 mb-6 space-y-3">
          <input type="text" placeholder="Nombre de la carpeta" value={nuevaCarpeta} onChange={(e) => setNuevaCarpeta(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          <input type="text" placeholder="Descripción (opcional)" value={nuevaDesc} onChange={(e) => setNuevaDesc(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          <div className="flex gap-2">
            <button onClick={crearCarpeta} className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm">Crear carpeta</button>
            <button onClick={() => setMostrarFormCarpeta(false)} className="text-gray-500 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : carpetas.length === 0 ? (
        <p className="text-gray-400 text-sm">No tienes carpetas aún. Crea una para empezar.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {carpetas.map(c => (
            <div key={c.id} className="bg-white rounded-xl shadow p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition" onClick={() => setCarpetaActiva(c)}>
              <div className="flex items-center gap-3">
                <Folder size={24} className="text-yellow-500" />
                <div>
                  <p className="font-medium text-gray-800">{c.nombre}</p>
                  {c.descripcion && <p className="text-sm text-gray-500">{c.descripcion}</p>}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); eliminarCarpeta(c.id); }} className="text-red-400 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}