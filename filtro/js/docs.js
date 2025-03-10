const filePath = path.resolve(finalDocsPath, "cargas.json");
const { shell } = require('electron');
var cargas = {};
const { PDFDocument, rgb } = require("pdf-lib");
console.log("pdf-lib cargado correctamente:", PDFDocument !== undefined);
const directorioPDFS = path.resolve(finalDocsPath, "transporte");
let info = "<p>Debes guardar los albaranes y facturas a preparar en la ruta <b>" + directorioPDFS + "</b>, si no tienes la carpeta creada, créala</p>";
info += "<p>Formato de nombre para los albaranes <b>EIDC00000-EPVT00000-A.pdf</b>, es decir  <b>CARGA-PEDIDO-A.pdf</b></p>";
info += "<p>Formato de nombre para las facturas  <b>EIDC00000-EPVT00000-F.pdf </b></p>";
info += "<p>Elige la fecha de transporte en el menú superior y esta herramienta te indicará que documentos te faltan</p>";
info += "<p><b>Recuerda vaciar la carpeta antes de empezar a preparar la documentación de otro día para no juntar albaranes de otros días</b></p>";
info += "<p>Usa los botones descargar albaranes y descargar facturas para generar en la carpeta <b>descargas</b> un archivo pdf con todos los albaranes y otro con las facturas</p>";
info += "<br />";
document.getElementById("listado").innerHTML = info;
let documentos = [];
let listadoCarpeta = pdfsEnCarpeta();
const checked = `<img src="./img/check.png" style="margin-left: 1em;">`;
const unchecked = `<img src="./img/unchecked.png" style="margin-left: 1em;">`;




try {
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf8");
    cargas = JSON.parse(data); // Devuelve los datos como objeto
  }
} catch (err) {
  console.error("Error al leer el archivo:", err);
  cargas = { almacenes: [], checkboxes: {} }; // Datos por defecto
}

var fechaCarga = "";

document.getElementById("fechaCarga").addEventListener("change", function () {
  fechaCarga = this.value;
  console.log(fechaCarga);
  mostrarDia();
});



function mostrarDia() {
  document.getElementById("listado").innerHTML = info;
  documentos == [];
  let show = "";

  cargas.forEach((carga) => {
    if (carga.fecha == fechaCarga) {

      carga.data.forEach((cuenta) => {

        cuenta.pedidos.forEach((pedido) => {


          const alb = `${carga.numero}-${pedido.pedido}-A`;
          const fct = `${carga.numero}-${pedido.pedido}-F`;
          let status = "";
          if (listadoCarpeta.includes(alb + ".pdf")) status = checked;
          else status = unchecked;
          show += `<p>${alb}${status}`;
          if (listadoCarpeta.includes(fct + ".pdf")) status = checked;
          else status = unchecked;
          show += ` ------- ${fct}${status}</p>`;
          documentos.push(alb);
          documentos.push(fct);
          
        });
      });

    }
  });
  
  document.getElementById("listado").innerHTML += show;
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