import usePageTitle from "../lib/usePageTitle";
import { DISENOS } from "../const/disenos";
import { CATEGORIAS } from "../const/categorias";
import { useEffect, useState } from "react";
import { cargarDisenoSeleccionado, guardarDisenoSeleccionado } from "../lib/disenoStorage";
import { obtenerOCrearIdVinculacion } from "../lib/vinculacionCookie";
import QrVinculacion from "../components/QrVinculacion";
import { obtenerCategoriaPorId } from "../lib/obtenerCategoriaPorId ";
//import { obtenerClubesFBIB } from "../lib/fbib";


export default function Control() {
    usePageTitle("Control Marcador");

    const [qrAbierto, setQrAbierto] = useState(false);
    const [categoriaToggle, setCategoriaToggle] = useState(false);

    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
    const [categoriaSeleccionadaNombre, setCategoriaSeleccionadaNombre] = useState<string | null>(null);

    const [categoriaSeleccionadaConf, setCategoriaSeleccionadaConf] = useState<any | null>(null);

    // const [confDiseno, setConfDiseno] = useState<any | null>(null)

    // useEffect(() => {
    //   const fetchClubes = async () => {
    //     const clubes = await obtenerClubesFBIB();
    //     console.log("Clubes obtenidos:", clubes);
    //   };

    //   fetchClubes();
    // }, []);
    

    // Variable Layout Seleccionado
    const [selectedDiseno, setSelectedDiseno] = useState<string | null>(() => {
      const disenoGuardado = cargarDisenoSeleccionado();

      const existe = DISENOS.some(
        (diseno) => diseno.id === disenoGuardado,
      );

      return existe ? disenoGuardado : null;
    });

    // Variable con id de vinculacion para el marcador y el mando
    const [vinculacionId] = useState(
      obtenerOCrearIdVinculacion,
    );

    const actualizarCategoria = (categoriaId: string) => {
      const categoria = CATEGORIAS.find((cat) => cat.id === categoriaId);
      if (categoria) {
        setCategoriaSeleccionada(categoria.id);
        setCategoriaSeleccionadaNombre(categoria.nombre);
      }
      toggleCategorias();
    };

  //const urlControl = `${window.location.origin}/control/${vinculacionId}`;

  const toggleCategorias = (() =>{
        if(categoriaToggle){
            setCategoriaToggle(false)
        } else (
            setCategoriaToggle(true)
        )
    })

  // Funcion para seleccionar un diseño y guardarlo en el almacenamiento local
  function seleccionarDiseno(disenoId: string) {
    setSelectedDiseno(disenoId);
    guardarDisenoSeleccionado(disenoId);
  }

  // Función para convertir segundos a minutos
  function segundosAMinutos(segundos: number): number {
    return segundos / 60;
  }

  // Cargar Configuracion segun categoria seleccionada
  useEffect(() => {
    if(!categoriaSeleccionada) return;
    const categoriaSeleccionadaConf = obtenerCategoriaPorId(categoriaSeleccionada);
    //console.log("Configuración de la categoría seleccionada:", categoriaSeleccionadaConf);

    setCategoriaSeleccionadaConf(categoriaSeleccionadaConf);
  }, [categoriaSeleccionada]);

  return (
    <>
    <main className="flex min-h-screen w-full  flex-col items-center justify-between p-24">
        <section className="grid grid-cols-[3fr_2fr] grid-rows-2 gap-10 max-w-7xl w-full mx-auto h-auto">

            {/* Seleccion Marcador Layout */}
            <div className="w-full h-auto p-4 rounded-lg bg-brand-blue-light shadow-[0px_0px_20px_0px_#002450]">
              <div className="flex gap-x-1 items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-primary" viewBox="0 -960 960 960">
                  <path d="M520-600v-240h320v240zM120-440v-400h320v400zm400 320v-400h320v400zm-400 0v-240h320v240zm80-400h160v-240H200zm400 320h160v-240H600zm0-480h160v-80H600zM200-200h160v-80H200zm160-80"/>
                </svg>
                <h2 className="text-3xl uppercase font-bold text-primary">Diseño de proyección</h2>
              </div>

              <div className="w-full flex flex-wrap gap-5 mt-5 items-center">
                {DISENOS.map((diseno) => (
                  <div key={diseno.id} className="w-86 h-auto">
                    <div className={`w-full p-2 border rounded-lg relative group cursor-pointer ${selectedDiseno === diseno.id ? 'border-primary border-2' : 'border-white'}`} onClick={() => seleccionarDiseno(diseno.id)}>
                      <img src={`/miniaturas/${diseno.miniatura}.png`} alt={diseno.nombre} className="w-full h-auto rounded-lg" />
                      <div className={`w-full h-full absolute top-0 left-0 bg-brand-blue-dark/20 rounded-lg group-hover:opacity-0 duration-300 ${selectedDiseno === diseno.id ? 'opacity-0' : 'opacity-100'}`}></div>
                    </div>

                    <div className="w-full flex flex-row items-center place-content-between mt-2">
                      <p className={`text-xl font-semibold ${selectedDiseno === diseno.id ? 'text-primary' : 'text-white/70'}`}>{diseno.nombre}</p>
                      <span className={`px-2 text-sm font-semibold py-px rounded bg-primary text-brand-blue-deep uppercase ${selectedDiseno === diseno.id ? 'block': 'hidden'}`}>
                        Activo
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
            </div>

            {/* Sincronizar y Configuracion Básica */}
            <div className="row-span-2 w-full flex flex-col gap-y-10">
              {/* Sincronización */}
              <div className="w-full h-auto p-4 rounded-lg bg-brand-blue-light shadow-[0px_0px_20px_0px_#002450] relative overflow-hidden">
                <span className="absolute -top-8 -right-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-30 h-30 fill-brand-blue/15" viewBox="0 -960 960 960">
                    <path d="M80-680v-200h200v80H160v120zm0 600v-200h80v120h120v80zm600 0v-80h120v-120h80v200zm120-600v-120H680v-80h200v200zM700-260h60v60h-60zm0-120h60v60h-60zm-60 60h60v60h-60zm-60 60h60v60h-60zm-60-60h60v60h-60zm120-120h60v60h-60zm-60 60h60v60h-60zm-60-60h60v60h-60zm240-320v240H520v-240zM440-440v240H200v-240zm0-320v240H200v-240zm-60 500v-120H260v120zm0-320v-120H260v120zm320 0v-120H580v120z"/>
                  </svg>
                </span>

                <div className="flex gap-x-1 items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-primary" viewBox="0 -960 960 960">
                    <path d="M720-320H575q-7-21-15.5-41.5T542-400h98v-160H413q-29-25-62.5-45T281-640h439zM80-160v-120q50 0 85 35t35 85zm200 0q0-83-58.5-141.5T80-360v-80q117 0 198.5 81.5T360-160zm160 0q0-75-28.5-140.5t-77-114-114-77T80-520v-80q91 0 171 34.5T391-471t94.5 140T520-160zm360 0H600q0-20-1.5-40t-4.5-40h206v-480H160v46q-20-3-40-4.5T80-680v-40q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160"/>
                  </svg>
                  <h2 className="text-3xl uppercase font-bold text-primary">Sincronización</h2>
                </div>
                <p className="text-white/70">Vincula un dispositivo móvil o tablet para usarlo como mando del marcador.</p>

                <div className="w-full bg-brand-blue-dark/50 rounded-lg mt-3 p-4 grid grid-cols-[1fr_auto] gap-x-2 items-center">
                  <div className="space-y-2">
                    <p className="text-white/70 uppercase text-sm font-semibold">Código de partido</p>
                    <span className="text-white text-5xl font-bold bebas-neue">{vinculacionId}</span>
                  </div>

                  <div onClick={() => setQrAbierto(true)} aria-label="Abrir QR" className="cursor-pointer relative group flex items-center place-content-center z-0">
                    <img src="/img/QRhover.svg" className="absolute top-0 left-0 w-full h-full object-contain group-hover:scale-110 duration-300 z-0" alt="QR" />
                    <span className="relative z-10">
                      <QrVinculacion partidoId={vinculacionId} size={80} />
                    </span>
                    
                    
                  </div>
                </div>
              </div>

              {/* Configuración Básica */}
              <div className="w-full h-auto p-4 rounded-lg bg-brand-blue-light shadow-[0px_0px_20px_0px_#002450] relative ">
                <div className="flex gap-x-1 items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-primary" viewBox="0 -960 960 960">
                    <path d="M160-120v-80h480v80zm226-194L160-540l84-86 228 226zm254-254L414-796l86-84 226 226zm184 408L302-682l56-56 522 522z"/>
                  </svg>
                  <h2 className="text-3xl uppercase font-bold text-primary">Reglas y tiempos</h2>
                </div>

                {/* Seleccionar Categoria */}
                <div className="w-full mt-5 grid grid-cols-[1fr_auto] gap-5 items-center">
                  <p className="text-white text-lg">Categoría</p>

                  <div className="relative">
                      <div onClick={() => toggleCategorias()} className={`w-60 rounded-lg border relative  border-border bg-brand-blue-dark/50 px-3 py-2 outline-none cursor-pointer transition focus:border-primary`}>
                          {/* Aquí irá el nombre del curso seleccionado */}
                          {
                              categoriaSeleccionadaNombre ? (
                                  <p>{categoriaSeleccionadaNombre}</p>
                              ):(
                                  <p>Selecciona una categoría</p>
                              )
                          }
                          <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-3 top-1/2 h-6 w-6 -translate-y-1/2 fill-neutral cursor-pointer" viewBox="0 -960 960 960">
                            <path d="M480-344 240-584l56-56 184 184 184-184 56 56z"/>
                        </svg>
                      </div>

                      

                      <div className={`absolute w-full max-h-50 bg-secondary-container z-10 rounded-2xl overflow-y-scroll scroll-personalizada ${!categoriaToggle && "hidden"}`}>
                          <div className='flex flex-col gap-y-1 p-2'>
                          {CATEGORIAS.map((categoria) => (
                                  <div onClick={() => actualizarCategoria(categoria.id)} className="cursor-pointer px-3 py-2 hover:bg-primary rounded-lg" key={categoria.id} >
                                      <p className='w-full flex items-center place-content-between'>
                                          {categoria.nombre}
                                      </p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                </div>

                {/* Divisor */}
                <div className="w-full mx-auto h-0.5 rounded my-5 bg-white/30">&nbsp;</div>
                
                <div className="relative">

                  {
                    categoriaSeleccionada ? (
                      <>
                      {/* Periodos y duracion */}
                      <div className="w-full grid grid-cols-[1fr_1fr] gap-5">
                          <div className="w-full flex flex-col gap-2 ">
                              <p className="text-white text-lg">Periodos</p>
                              <p className="w-full bg-brand-blue-dark/50 px-3 py-2 rounded-lg text-white">{categoriaSeleccionadaConf?.reglamento.periodos.cantidad}</p>
                          </div>

                          <div className="w-full flex flex-col gap-2 ">
                              <p className="text-white text-lg">Duración</p>
                              <p className="w-full bg-brand-blue-dark/50 px-3 py-2 rounded-lg text-white">{segundosAMinutos( categoriaSeleccionadaConf?.reglamento.periodos.duracion)} min</p>
                          </div>
                      </div>

                      {/* Divisor */}
                      <div className="w-full mx-auto h-0.5 rounded my-5 bg-white/30">&nbsp;</div>

                      {/* Periodos y duracion */}
                      <div className="w-full grid grid-cols-[1fr_1fr] gap-5">
                          <div className="w-full flex flex-col gap-2 ">
                              <p className="text-white text-lg">Proroga</p>
                              <p className="w-full bg-brand-blue-dark/50 px-3 py-2 rounded-lg text-white">{categoriaSeleccionadaConf?.reglamento.prorroga.permitida === true ?  'Habilitada' : 'Deshabilitada' }</p>
                          </div>

                          <div className="w-full flex flex-col gap-2 ">
                              <p className="text-white text-lg">Duración</p>
                              <p className="w-full bg-brand-blue-dark/50 px-3 py-2 rounded-lg text-white">{segundosAMinutos( categoriaSeleccionadaConf?.reglamento.prorroga.duracion)} min</p>
                          </div>
                      </div>
                      </>
                    ):(
                      <div className=" w-full h-50 flex flex-col gap-5 items-center place-content-center">

                              <p className="text-2xl text-primary uppercase font-semibold">Seleccione una categoria</p>
                      </div>
                    )
                  }
                </div>
                


              </div>
            </div>

            {/* Configuración Avanzada */}
            <div className="w-full h-auto p-4 rounded-lg bg-brand-blue-light shadow-[0px_0px_20px_0px_#002450]">
                <div className="flex gap-x-1 items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-primary" viewBox="0 -960 960 960">
                    <path d="M162-520h114q-6-38-23-71t-43-59q-18 29-30.5 61.5T162-520m522 0h114q-5-36-17.5-68.5T750-650q-26 26-43 59t-23 71M210-310q26-26 43-59t23-71H162q5 36 17.5 68.5T210-310m540 0q18-29 30.5-61.5T798-440H684q6 38 23 71t43 59M358-520h82v-278q-53 8-98.5 29.5T260-712q39 38 64.5 86.5T358-520m162 0h82q8-57 33.5-105.5T700-712q-36-35-81.5-56.5T520-798zm-80 358v-278h-82q-8 57-33.5 105.5T260-248q36 35 81.5 56.5T440-162m80 0q53-8 98.5-29.5T700-248q-39-38-64.5-86.5T602-440h-82zm-40 82q-83 0-156-31.5T197-197t-85.5-127T80-480t31.5-156T197-763t127-85.5T480-880t156 31.5T763-763t85.5 127T880-480t-31.5 156T763-197t-127 85.5T480-80"/>
                  </svg>
                  <h2 className="text-3xl uppercase font-bold text-primary">Datos del partido</h2>
                </div>

                <div className="w-full mt-5 flex flex-wrap gap-5">
                  <div className="w-86 flex flex-col gap-y-2 items-center">
                    <h3 className="text-2xl font-bold text-white uppercase text-center">Local</h3>

                    <input className="w-70 uppercase bg-brand-blue-dark/50 px-3 py-2 rounded-lg text-white" placeholder="Nombre equipo"/>
                  </div>

                  <div className="w-86 flex flex-col gap-y-2 items-center">
                    <h3 className="text-2xl font-bold text-white uppercase text-center">Visitante</h3>

                    <input className="w-70 uppercase bg-brand-blue-dark/50 px-3 py-2 rounded-lg text-white" placeholder="Nombre equipo"/>
                  </div>
                </div>
            </div>


            {/* PopUp QR */}
            {qrAbierto && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-brand-blue-deep/85 p-5 backdrop-blur-sm"
                onClick={() => setQrAbierto(false)}
                role="dialog"
                aria-modal="true"
                aria-label="Código QR de vinculación"
              >
                <div
                  className="relative flex max-h-[95vh] w-full max-w-xl flex-col items-center rounded-2xl border-2 border-primary bg-brand-blue-dark p-7 shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setQrAbierto(false)}
                    className="absolute top-4 right-4 flex size-10 cursor-pointer items-center justify-center rounded-full bg-brand-blue-light text-2xl font-bold text-white transition-colors hover:bg-primary hover:text-brand-blue-deep"
                    aria-label="Cerrar código QR"
                  >
                    ×
                  </button>

                  <div className="mb-5 text-center">
                    <h2 className="text-3xl font-bold uppercase text-primary">
                      Vincular controlador
                    </h2>

                    <p className="mt-1 text-white/70">
                      Escanea el código desde el móvil o la tablet
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-2xl bg-white p-3">
                    <QrVinculacion
                      partidoId={vinculacionId}
                      size={360}
                    />
                  </div>

                  <p className="mt-5 text-sm font-semibold uppercase text-white/60">
                    Código de partido
                  </p>

                  <span className="bebas-neue text-5xl font-bold tracking-wider text-white">
                    {vinculacionId}
                  </span>
                </div>
              </div>
            )}
        </section>

        
    </main>
    <div className="w-full bg-brand-blue-deep h-30 gap-y-5 p-4">
        <div className="max-w-7xl w-full h-full mx-auto flex flex-col gap-y-5 items-center place-content-center">
            <div className="w-max h-max px-4 py-1 flex gap-x-2 rounded-lg items-center bg-primary-container">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-brand-blue-dark" viewBox="0 -960 960 960">
              <path d="M440-320h80v-166l64 63 57-57-161-160-160 160 57 56 63-63zM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160zm0-80h640v-480H160zm0 0v-480z"/>
            </svg>
            <p className="text-brand-blue-dark text-2xl font-bold">Abrir Proyección</p>
          </div>
        </div>
        
    </div>
    </>
  );
}