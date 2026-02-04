// --- 1. CONFIGURACIÓN ---
const SUPABASE_URL = 'https://grlwkaxsfvrvtuvlsvxv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8QnYD4TWUMFmiTo6Pd5_3w_yxmkgWCc'; // Tu clave pública
const CSV_FILE = 'CATALOGO_FINAL_CIACOLLOR.csv';

// --- 2. PARSER DE CSV AVANZADO (Para leer descripciones con HTML y comas) ---
function parseCSV(text) {
    const rows = [];
    let row = [];
    let currentToken = '';
    let insideQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"' && insideQuotes && nextChar === '"') {
            currentToken += '"'; // Doble comilla dentro de comillas
            i++;
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            row.push(currentToken);
            currentToken = '';
        } else if ((char === '\r' || char === '\n') && !insideQuotes) {
            if (currentToken || row.length > 0) row.push(currentToken);
            if (row.length > 0) rows.push(row);
            row = [];
            currentToken = '';
            if (char === '\r' && nextChar === '\n') i++;
        } else {
            currentToken += char;
        }
    }
    return rows.slice(1); // Ignorar la cabecera
}

// --- 3. LÓGICA PRINCIPAL ---
let supabaseClient;
try { supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY); } catch (e) { console.error("Error DB", e); }
let productos = [];

// Cargar Datos (CSV + Supabase)
async function iniciar() {
    try {
        // 1. Descargar el CSV (con truco anti-cache)
        const response = await fetch(`${CSV_FILE}?v=${Date.now()}`);
        if (!response.ok) throw new Error("No se encontró el archivo CSV");
        const csvText = await response.text();
        
        // 2. Convertir CSV a Objetos
        const filas = parseCSV(csvText);
        
        const catalogoCSV = filas.map(col => {
            // Mapeo seguro de columnas (basado en tu archivo)
            // 0:ID, 1:Nombre, 2:Precio, 3:Stock_General, 5:Imagen_Base, 6:Descripcion
            if (!col[0]) return null; // Saltar filas vacías
            return {
                id: col[0].trim(),
                nombre: col[1],
                // Si el precio viene vacío o con texto, poner 0
                precioBase: parseFloat(col[2].replace(',', '.')) || 0, 
                stockBase: col[3] && col[3].toUpperCase().includes('SI'),
                img: col[5] || 'https://via.placeholder.com/300?text=Sin+Imagen',
                desc: col[6] || '',
                categoria: clasificar(col[1], col[6])
            };
        }).filter(p => p !== null);

        // 3. Descargar Precios Actualizados de Supabase
        let preciosNube = [];
        if (supabaseClient) {
            const { data } = await supabaseClient.from('precios').select('*');
            if (data) preciosNube = data;
        }

        // 4. Fusionar CSV con Nube
        productos = catalogoCSV.map(prod => {
            const override = preciosNube.find(n => n.id === prod.id);
            return {
                ...prod,
                precio: override ? override.precio : prod.precioBase,
                stock: override ? override.stock : prod.stockBase
            };
        });

        renderizar();

    } catch (error) {
        console.error("Error grave:", error);
        document.getElementById('grid').innerHTML = `<p class="text-red-500 p-4">Error cargando datos: ${error.message}. <br>Verifica que el archivo CSV esté subido.</p>`;
    }
}

// Clasificador Automático
function clasificar(nombre, desc) {
    const txt = (nombre + ' ' + desc).toLowerCase();
    if (txt.includes('emborrachada') || txt.includes('ciaflex') || txt.includes('impermeabilizante')) return 'Emborrachada';
    if (txt.includes('sintetico') || txt.includes('sintético') || txt.includes('solvente') || txt.includes('esmalte')) return 'Sintético';
    return 'Al Agua'; // Por defecto
}

// Renderizar Grid
function renderizar() {
    const grid = document.getElementById('grid');
    const busqueda = document.getElementById('search').value.toLowerCase();
    const catFiltro = document.getElementById('filterCategory').value;
    const emptyState = document.getElementById('emptyState');

    const filtrados = productos.filter(p => {
        const matchTexto = p.nombre.toLowerCase().includes(busqueda) || p.id.includes(busqueda);
        const matchCat = catFiltro === 'Todos' || p.categoria === catFiltro;
        return matchTexto && matchCat;
    });

    if (filtrados.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        grid.innerHTML = filtrados.map(p => `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col group hover:shadow-md transition-all">
                <div class="relative">
                    <img src="${p.img}" class="w-full h-40 object-contain mb-4 group-hover:scale-105 transition-transform" onerror="this.src='https://via.placeholder.com/150'">
                    <span class="absolute top-0 right-0 text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500">ID: ${p.id}</span>
                </div>
                
                <h3 class="font-bold text-gray-800 text-sm h-10 line-clamp-2 leading-tight mb-2">${p.nombre}</h3>
                
                <div class="mt-auto pt-4 border-t border-dashed border-gray-200">
                    <div class="flex justify-between items-end">
                        <div>
                            <p class="text-[10px] text-gray-400 uppercase font-bold">Precio</p>
                            <div class="flex items-center text-blue-700 font-bold text-lg">
                                <span>Gs. </span>
                                <input type="number" value="${p.precio}" 
                                    onchange="actualizarPrecio('${p.id}', this.value)"
                                    class="w-24 bg-transparent outline-none border-b border-transparent focus:border-blue-500 hover:border-gray-300 text-right ml-1">
                            </div>
                        </div>
                        <div class="flex flex-col items-end">
                            <span class="text-[10px] ${p.stock ? 'text-green-500' : 'text-red-400'} font-bold mb-1">
                                ${p.stock ? 'DISPONIBLE' : 'AGOTADO'}
                            </span>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" ${p.stock ? 'checked' : ''} onchange="actualizarStock('${p.id}', this.checked)" class="sr-only peer">
                                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Función de Guardado (Admin)
async function actualizarPrecio(id, valor) {
    if(!supabaseClient) return alert("Base de datos no conectada");
    try {
        await supabaseClient.from('precios').upsert({ id: id, precio: parseFloat(valor) });
        // Actualizar localmente para no recargar
        const p = productos.find(x => x.id === id);
        if(p) p.precio = parseFloat(valor);
        console.log("Precio guardado");
    } catch(e) { alert("Error guardando: " + e.message); }
}

async function actualizarStock(id, estado) {
    if(!supabaseClient) return alert("Base de datos no conectada");
    try {
        await supabaseClient.from('precios').upsert({ id: id, stock: estado }); // Upsert maneja la mezcla
        const p = productos.find(x => x.id === id);
        if(p) p.stock = estado;
        renderizar(); // Re-pintar para cambiar el texto "Disponible/Agotado"
    } catch(e) { alert("Error guardando stock"); }
}

// Eventos Globales
document.getElementById('search').addEventListener('input', renderizar);
document.getElementById('filterCategory').addEventListener('change', renderizar);

// ¡ARRANCAR MOTORES!
iniciar();
