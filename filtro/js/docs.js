const filePath = path.resolve(finalDocsPath, "cargas.json");
const { shell } = require('electron');
var cargas = {};
const { PDFDocument, rgb } = require("pdf-lib");
console.log("pdf-lib cargado correctamente:", PDFDocument !== undefined);
const directorioPDFS = path.resolve(finalDocsPath, "transporte");
let info =  "<p>Carga el listado de documentos a preparar buscando el día en el selector superior.</p>";
info += `<p>Asegúrate de tener creada la carpeta <b>${directorioPDFS}</b> y que esté vacía.</p>`;
info += "<p>Arrastra los albaranes y facturas que descargues de backoffice, <b>DE UNO EN UNO</b>, en el dibujo de subir archivos a la derecha.</p>";
info += "<p>Si son albaranes o facturas válidos del transporte de ese día, los copiará a la carpeta de transporte y los renombará adecuadamente.</p>";
info += "<p><b>Recuerda vaciar la carpeta antes de empezar a preparar la documentación de otro día para no juntar albaranes de otros días.</b></p>";
info += "<p>Una vez tengas todos, usa los botones descargar albaranes y descargar facturas para generar en la carpeta <b>descargas</b> un archivo pdf con todos los albaranes y otro con las facturas.</p>";
info += "<p>En los albaranes se anotará el número de almacén y las observaciones del pedido de ventas.</p>";
info += "<br />";
document.getElementById("listado").innerHTML = info;
let documentos = [];
let listadoCarpeta = pdfsEnCarpeta();
const checked = `<img src="./img/check.png" style="margin-left: 1em;">`;
const unchecked = `<img src="./img/unchecked.png" style="margin-left: 1em;">`;
const dropArea = document.getElementById('drop-area');


function leerDia() {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      cargas = JSON.parse(data); // Devuelve los datos como objeto
    }
  } catch (err) {
    console.error("Error al leer el archivo:", err);
    cargas = { almacenes: [], checkboxes: {} }; // Datos por defecto
  }
  listadoCarpeta = pdfsEnCarpeta();
}

var fechaCarga = "";

document.getElementById("fechaCarga").addEventListener("change", function () {
  leerDia();
  fechaCarga = this.value;
  mostrarDia();
});



function mostrarDia() {
  documentos == [];
  let show = "";

  cargas.forEach((carga) => {
    if (carga.fecha == fechaCarga) {
      show += `<h3>${carga.numero}</h3>`;
      carga.data.forEach((cuenta) => {

        
        cuenta.pedidos.forEach((pedido) => {

          const alb = `${carga.numero}-${pedido.pedido}-A.pdf`;
          const fct = `${carga.numero}-${pedido.pedido}-F.pdf`;
          documentos.push(alb);
          documentos.push(fct);

          show += `<p>`;


          let status = "";
          if (listadoCarpeta.includes(alb)) status = checked;
          else status = unchecked;
          show += `   ${status} ALBARAN`;

          if (listadoCarpeta.includes(fct)) status = checked;
          else status = unchecked;
          show += `   ${status} FACTURA`;


          show += `   --- ${cuenta.nombre} - ${pedido.pedido}   `;

          show += `</p>`;
          
        });
      });

    }
  });
  
  document.getElementById("checklist").innerHTML = show;
}


function pdfsEnCarpeta() {
  try {
      const filePath = path.resolve(finalDocsPath, "transporte");
      const archivos = fs.readdirSync(filePath);
      const pdfs = archivos.filter(archivo => archivo.toLowerCase().endsWith('.pdf'));
      return pdfs;
  } catch (error) {
      return [];
  }
}

async function combinarPDFsConA() {
  try {
      // Carpeta de Descargas del usuario
      const downloadPath = path.resolve(finalDownloadPath, "ALBARANES-" + fechaCarga + ".pdf");

      // Filtrar archivos que terminan en "A.pdf"
      const archivos = fs.readdirSync(directorioPDFS);
      const pdfsFiltrados = archivos.filter(archivo => archivo.endsWith("A.pdf"));

      if (pdfsFiltrados.length === 0) {
          console.log("No se encontraron archivos que terminen en 'A.pdf'");
          return;
      }

      // Crear un nuevo PDF vacío
      const pdfFinal = await PDFDocument.create();

      for (const pdfNombre of pdfsFiltrados) {
          const pdfPath = path.join(directorioPDFS, pdfNombre);
          const pdfBytes = fs.readFileSync(pdfPath);
          const pdfCargado = await PDFDocument.load(pdfBytes);

          // Obtener todas las páginas y agregar una anotación en cada una
          for (const [index, page] of pdfCargado.getPages().entries()) {
            const { width, height } = page.getSize();

            let numAlmacen = await obtenerTexto(1, pdfNombre);
            let textoObservaciones = await obtenerTexto(2, pdfNombre);

            // Agregar anotación de texto en la parte inferior derecha de la página
            page.drawText(numAlmacen, {
              x: 40,
              y: height - 120,
              size: 24,
              color: rgb(0, 0, 0),
            });

            page.drawText(textoObservaciones, {
              x: 40,
              y: 60,
              size: 16,
              color: rgb(0, 0, 0),
            });
          }

          // Copiar todas las páginas al PDF final
          const paginas = await pdfFinal.copyPages(pdfCargado, pdfCargado.getPageIndices());
          paginas.forEach(pagina => pdfFinal.addPage(pagina));
      }

      // Guardar el PDF final en la carpeta de descargas
      const pdfBytesFinal = await pdfFinal.save();
      fs.writeFileSync(downloadPath, pdfBytesFinal);

      console.log(`PDF combinado guardado en: ${downloadPath}`);
  } catch (error) {
      console.error("Error al combinar los PDFs:", error);
  }
}


async function combinarPDFsConF() {
  try {
      // Carpeta de Descargas del usuario
      const downloadPath = path.resolve(finalDownloadPath, "FACTURAS-" + fechaCarga + ".pdf");

      // Filtrar archivos que terminan en "F.pdf"
      const archivos = fs.readdirSync(directorioPDFS);
      const pdfsFiltrados = archivos.filter(archivo => archivo.endsWith("F.pdf"));

      if (pdfsFiltrados.length === 0) {
          console.log("No se encontraron archivos que terminen en 'F.pdf'");
          return;
      }

      // Crear un nuevo PDF vacío para combinar los archivos
      const pdfFinal = await PDFDocument.create();

      for (const pdfNombre of pdfsFiltrados) {
          const pdfPath = path.join(directorioPDFS, pdfNombre);
          const pdfBytes = fs.readFileSync(pdfPath);
          const pdfCargado = await PDFDocument.load(pdfBytes);

          // Obtener el número total de páginas
          const totalPaginas = pdfCargado.getPageCount();

          // Si tiene 3 o más páginas, eliminar las dos últimas
          if (totalPaginas >= 3) {
              pdfCargado.removePage(totalPaginas - 1); // Última página
              pdfCargado.removePage(totalPaginas - 2); // Penúltima página
          }

          // Copiar las páginas restantes al PDF final
          const paginas = await pdfFinal.copyPages(pdfCargado, pdfCargado.getPageIndices());
          paginas.forEach(pagina => pdfFinal.addPage(pagina));
      }

      // Guardar el PDF final en la carpeta de descargas
      const pdfBytesFinal = await pdfFinal.save();
      fs.writeFileSync(downloadPath, pdfBytesFinal);

      console.log(`PDF combinado guardado en: ${downloadPath}`);
  } catch (error) {
      console.error("Error al combinar los PDFs:", error);
  }
}


function abrirCarpetaPDFs() {
  shell.openPath(directorioPDFS);
}

function abrirCarpetaDescargas() {
  shell.openPath(finalDownloadPath);
}

function obtenerTexto(Nmensaje, comboCargaPedido) {
  let stringaux = comboCargaPedido.split("-");
  let numpedido = stringaux[1];

  for (const carga of cargas) {
    for (const cuenta of carga.data) {
      for (const pedido of cuenta.pedidos) {
        if (numpedido == pedido.pedido) {
          if (Nmensaje == 1) {
            let aux = pedido.lineas[0].almacen;
            if (aux.includes("<span")) aux = "";
            return aux || ""; // Retorna vacío si es undefined
          } 
          if (Nmensaje == 2) {
            let aux2 = pedido.obser1;
            if (aux2.includes("<span")) aux2 = "";
            return aux2 || ""; // Retorna vacío si es undefined
          }
        }
      }
    }
  }

  return ""; // Retorna un string vacío si no se encuentra nada
}

// GESTION DE DROP ITEMS

// Evita el comportamiento por defecto del drag & drop
dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropArea.classList.add('dragover');
});

dropArea.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropArea.classList.remove('dragover');
});

dropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dropArea.classList.remove('dragover');
  // Resto de tu código para manejar el archivo...
});

dropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  console.log("Has subido un pdf.");
  const files = e.dataTransfer.files;
  let ruta = "";
  
  Array.from(files).forEach(file => {
    if (file.type === 'application/pdf') {
      ruta = path.resolve(finalDownloadPath, file.name);
      console.log(`Path del archivo: ${ruta}`);
      const reader = new FileReader();
      reader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
          let fullText = '';
          let numPages = pdf.numPages;
          let pagesPromises = [];
          
          // Itera por cada página para extraer el texto
          for (let i = 1; i <= numPages; i++) {
            pagesPromises.push(
              pdf.getPage(i).then(page => {
                return page.getTextContent().then(textContent => {
                  // Combina los strings de cada elemento del contenido
                  const pageText = textContent.items.map(item => item.str).join(' ');
                  fullText += pageText;
                });
              })
            );
          }
          
          // Una vez procesadas todas las páginas, busca la palabra
          Promise.all(pagesPromises).then(() => {
            // Cambia 'palabra' por la palabra que desees buscar
            probarSiContiene(fullText, ruta);

          });
        }).catch(err => console.error('Error al cargar el PDF: ', err));
      };
      reader.readAsArrayBuffer(file);
    }
  });
});

function probarSiContiene(documento, ruta) {

  cargas.forEach((carga) => {
    if (carga.fecha == fechaCarga) {
      carga.data.forEach((cuenta) => {
        cuenta.pedidos.forEach((pedido) => {
          if (documento.includes(pedido.pedido)) { 
            if (documento.includes(pedido.lineas[0].codigo)) {
              console.log(`El documento contiene ${pedido.pedido} y ${pedido.lineas[0].codigo}`);
              if (documento.includes("EFAC")) {
                console.log(`Nombre factura: ${carga.numero}-${pedido.pedido}-F.pdf`);
                moverArchivo(ruta, `${carga.numero}-${pedido.pedido}-F.pdf`, "FACTURA", cuenta.nombre);
                return;
              } else if (documento.includes("EALB")) {
                console.log(`Nombre albarán: ${carga.numero}-${pedido.pedido}-A.pdf`);
                moverArchivo(ruta, `${carga.numero}-${pedido.pedido}-A.pdf`, "ALBARAN", cuenta.nombre);
                return;
              }
              else console.log("No se si es un albarán o una factura.");
              return;
            }
            else {
              console.log("No encuentro el producto en ese documento.");
              return;
            }
            return;
          }
        });
      });
    }
  });
}


function moverArchivo(rutaOriginal, nombreFinal, tipo, cliente) {
  // Supón que estos valores vienen de tu lógica
const originalPath = rutaOriginal;
const destinationFolder = path.resolve(finalDocsPath, "transporte");;
const newFileName = nombreFinal;

// Construye la ruta completa de destino
const destinationPath = path.join(destinationFolder, newFileName);

// Mueve (y renombra) el archivo
fs.copyFile(originalPath, destinationPath, (err) => {
  if (err) {
    console.error('Error al copiar el archivo:', err);
  } else {
    alert(`${tipo} de ${cliente} > ${newFileName} guardado en ${destinationPath}`);
  }
});
}


setInterval(function(){
  console.log("Rellamada a cargar Json de cargas y mostrar listado actualizado");
  leerDia();
  mostrarDia();
}, 5000);