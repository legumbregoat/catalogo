// --- 1. CONFIGURACIÓN ---
const SUPABASE_URL = 'https://grlwkaxsfvrvtuvlsvxv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8QnYD4TWUMFmiTo6Pd5_3w_yxmkgWCc'; // Clave pública segura
const WHATSAPP_NUMBER = '595987212934'; 

// --- 2. BASE DE DATOS LOCAL (Respaldo + Descripciones HTML) ---
const catalogoBase = [
    {
        id: "2109", 
        nombre: "Tinta Acrílica Emborrachada Ciaflex 20kg", 
        img: "https://images.tcdn.com.br/img/img_prod/1139809/tinta_acrilica_emborrachada_ciacollor_20kg_2109_1_9f894b5ff4fccf9f785014ad04918a0f.png", 
        precio: 450000,
        desc: `<h3>Ciaflex Fundo e Acabamento</h3><p>Produto de alta performance com resinas elásticas. <ul><li><strong>Hidrorrepelente:</strong> Bloqueia chuva.</li><li><strong>Flexível:</strong> Cobre fissuras de 0,3mm.</li></ul><p><strong>Secado:</strong> 1 hora ao toque.</p>`
    },
    // ... (Aquí van el resto de tus productos, usa la lista completa anterior) ...
    {
        id: "2073", 
        nombre: "Tinta Acrílica Econômica Profissional 16lt", 
        img: "https://images.tcdn.com.br/img/img_prod/1139809/tinta_acrilica_economica_profissional_fosco_ciacollor_16_l_2073_1_eb2c72aea432510f9efe1220835a3c46.png", 
        precio: 280000, 
        desc: "<p>Tinta interior de excelente custo-benefício. <strong>Rendimento:</strong> 300m².</p>"
    }
    // NOTA: Para no hacer este código infinito, he resumido. 
    // Copia los objetos del código anterior si quieres todos los productos aquí.
];

// --- 3. LÓGICA DEL SISTEMA ---
let supabaseClient;
try { supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY); } catch (e) { console.error("Error DB", e); }
let productos = [];

// Clasificador Automático
function clasificar(p) {
    const txt = (p.nombre + ' ' + (p.desc || '')).toLowerCase();
    if (txt.includes('emborrachada') || txt.includes('ciaflex') || txt.includes('impermeabilizante')) 
        return { tipo: 'Emborrachada', color: 'text-purple-700 bg-purple-50 border-purple-200' };
    if (txt.includes('epoxi') || txt.includes('sintetico') || txt.includes('sintético') || txt.includes('solvente') || txt.includes('spray')) 
        return { tipo: 'Sintético', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    return { tipo: 'Al Agua', color: 'text-blue-700 bg-blue-50 border-blue-200' };
}

// Iniciar Sistema
async function iniciar() {
    let preciosNube = [];
    if(supabaseClient) {
        // Intentar bajar precios actualizados
        try {
            const { data } = await supabaseClient.from('precios').select('*');
            if(data) preciosNube = data;
        } catch(e) { console.log("Modo Offline"); }
    }

    // Mezclar datos
    productos = catalogoBase.map(base => {
        const extra = preciosNube.find(x => x.id === base.id);
        const cat = clasificar(base);
        return {
            ...base,
            precio: extra ? extra.precio : base.precio,
            stock: extra ? extra.stock : 'SI',
            categoria: cat
        };
    });
    renderizar();
}

// Renderizar Grid
function renderizar() {
    const grid = document.getElementById('grid');
    const busqueda = document.getElementById('search').value.toLowerCase();
    const categoria = document.getElementById('filterCategory').value;
    const emptyState = document.getElementById('emptyState');

    const filtrados = productos.filter(p => {
        const matchTexto = p.nombre.toLowerCase().includes(busqueda) || p.id.includes(busqueda);
        const matchCat = categoria === 'Todos' || p.categoria.tipo === categoria;
        return matchTexto && matchCat;
    });

    if(filtrados.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    grid.innerHTML = filtrados.map(p => `
        <div onclick="abrirModal('${p.id}')" class="product-card bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer flex flex-col h-full group relative overflow-hidden">
            <span class="absolute top-3 left-3 text-[10px] text-gray-400 font-mono bg-white/90 px-2 py-0.5 rounded border">#${p.id}</span>
            
            <div class="mb-4 mt-2">
                <img src="${p.img}" class="h-40 w-full object-contain mx-auto ${p.stock === 'NO' ? 'grayscale opacity-60' : ''}" loading="lazy">
            </div>
            
            <div class="flex-grow">
                 <span class="inline-block px-2 py-0.5 text-[9px] font-bold uppercase rounded border mb-2 ${p.categoria.color}">
                    ${p.categoria.tipo}
                </span>
                <h3 class="text-sm font-bold text-gray-800 leading-tight line-clamp-2">${p.nombre}</h3>
            </div>

            <div class="mt-4 pt-3 border-t border-gray-50 flex justify-between items-end">
                <div>
                    <p class="text-[10px] text-gray-400 uppercase font-semibold">Precio</p>
                    <p class="font-black text-gray-900 text-lg">Gs. ${(p.precio).toLocaleString('es-PY')}</p>
                </div>
                <div class="text-right">
                    <span class="text-[10px] font-bold block mb-1 ${p.stock === 'SI' ? 'text-green-600' : 'text-red-500'}">
                        ${p.stock === 'SI' ? '● Disponible' : '● Agotado'}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

// --- LOGICA MODAL Y WHATSAPP ---
let productoActual = null;

function abrirModal(id) {
    const p = productos.find(x => x.id === id);
    if(!p) return;
    productoActual = p;

    // Llenar datos
    document.getElementById('modalImg').src = p.img;
    document.getElementById('modalTitle').innerText = p.nombre;
    document.getElementById('modalId').innerText = `SKU: ${p.id}`;
    document.getElementById('modalPrice').innerText = `Gs. ${(p.precio).toLocaleString('es-PY')}`;
    document.getElementById('modalInputPrice').value = p.precio;
    document.getElementById('modalDesc').innerHTML = p.desc || "<p>Sin descripción detallada.</p>";

    // Badge Categoría
    const badge = document.getElementById('modalBadge');
    badge.className = `inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border mb-2 ${p.categoria.color}`;
    badge.innerText = p.categoria.tipo;

    // Generar LINK DE WHATSAPP dinámico
    const mensaje = `Hola Ciacollor, estoy interesado en este producto:\n\n*${p.nombre}*\nID: ${p.id}\nPrecio: Gs. ${(p.precio).toLocaleString('es-PY')}\n\n¿Tienen stock?`;
    const urlWhatsapp = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
    
    const btnWs = document.getElementById('modalWhatsapp');
    btnWs.href = urlWhatsapp;
    
    // Si no hay stock, cambiar estilo del botón
    if(p.stock === 'NO') {
        btnWs.classList.add('opacity-50', 'pointer-events-none', 'grayscale');
        btnWs.innerHTML = 'SIN STOCK MOMENTÁNEAMENTE';
    } else {
        btnWs.classList.remove('opacity-50', 'pointer-events-none', 'grayscale');
        btnWs.innerHTML = `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg> PEDIR ESTE PRODUCTO AHORA`;
    }

    // Animación Entrada
    const modal = document.getElementById('productModal');
    modal.classList.remove('hidden');
    // Pequeño delay para permitir que la clase hidden se quite antes de animar opacidad
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div[class*="transform"]').classList.remove('scale-95');
        modal.querySelector('div[class*="transform"]').classList.add('scale-100');
    }, 10);
}

function closeModal() {
    const modal = document.getElementById('productModal');
    modal.classList.add('opacity-0');
    modal.querySelector('div[class*="transform"]').classList.remove('scale-100');
    modal.querySelector('div[class*="transform"]').classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// Guardar precio (Admin)
document.getElementById('modalInputPrice').addEventListener('change', async (e) => {
    if(productoActual) {
        const nuevoPrecio = Number(e.target.value);
        productoActual.precio = nuevoPrecio;
        document.getElementById('modalPrice').innerText = `Gs. ${(nuevoPrecio).toLocaleString('es-PY')}`;
        
        // Toast
        const toast = document.getElementById('toast');
        toast.classList.remove('translate-x-full', 'opacity-0');
        setTimeout(() => toast.classList.add('translate-x-full', 'opacity-0'), 2000);

        if(supabaseClient) {
            await supabaseClient.from('precios').upsert({ id: productoActual.id, precio: nuevoPrecio });
        }
        renderizar();
    }
});

// Eventos
document.getElementById('btnAdmin').addEventListener('click', () => {
    if(prompt("PIN de Acceso:") === "0202") {
        document.body.classList.add('is-admin');
        alert("Modo Admin Activado 🔓");
    }
});
document.getElementById('search').addEventListener('input', renderizar);
document.getElementById('filterCategory').addEventListener('change', renderizar);
document.addEventListener('keydown', (e) => { if(e.key === "Escape") closeModal(); });

// Arrancar
iniciar();
