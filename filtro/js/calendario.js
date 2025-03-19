const filePath = path.resolve(finalDocsPath, "cargas.json");
var cargas = {};
try {
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf8");
    cargas = JSON.parse(data); // Devuelve los datos como objeto
  }
} catch (err) {
  console.error("Error al leer el archivo:", err);
  cargas = { almacenes: [], checkboxes: {} }; // Datos por defecto
}

document.getElementById("fechaDesde").value = Date().now - 5;
document.getElementById("fechaHasta").value = Date().now + 5;

const fechaDesde = document.getElementById("fechaDesde");
const fechaHasta = document.getElementById("fechaHasta");
const ctx = document.getElementById("calendario").getContext("2d");

fechaDesde.addEventListener("change", function () {
  mostrarDetalle();
  actualizarGrafico();
});

fechaHasta.addEventListener("change", function () {
  mostrarDetalle();
  actualizarGrafico();
});

const hoy = new Date();
const desde = new Date();
const hasta = new Date();
desde.setDate(hoy.getDate() - 5);
hasta.setDate(hoy.getDate() + 5);

let fechaFormateada = desde.toISOString().split("T")[0];
fechaDesde.value = fechaFormateada;
fechaFormateada = hasta.toISOString().split("T")[0];
fechaHasta.value = fechaFormateada;

function agruparDatos(datos) {
  const agrupado = {};

  datos.forEach((carga) => {
    if (!agrupado[carga.fecha]) {
      agrupado[carga.fecha] = { cantidad: 0, totalImporte: 0 };
    }

    // Contar la cantidad de objetos en data
    agrupado[carga.fecha].cantidad += carga.data.length;

    // Sumar los importes recorriendo data → pedidos → lineas → importe
    carga.data.forEach((dataItem) => {
      dataItem.pedidos.forEach((pedido) => {
        pedido.lineas.forEach((linea) => {
          let sinIVA = (linea.importe / 1.21).toFixed(2);
          agrupado[carga.fecha].totalImporte += parseFloat(sinIVA);
        });
      });
    });
  });

  return Object.entries(agrupado)
    .map(([fecha, valores]) => ({ fecha, ...valores }))
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)); // Orden ascendente
}

// Función para actualizar el gráfico
function actualizarGrafico() {
  const desde = new Date(fechaDesde.value);
  const hasta = new Date(fechaHasta.value);

  // Filtrar datos por rango de fecha y agrupar
  const datosFiltrados = agruparDatos(
    cargas.filter((carga) => {
      const fechaItem = new Date(carga.fecha);
      return fechaItem >= desde && fechaItem <= hasta;
    })
  );

  // Extraer datos para el gráfico
  const labels = datosFiltrados.map((d) => {
    const fechaObj = new Date(d.fecha);
    const opciones = { weekday: "short", day: "2-digit", month: "2-digit" };
    return fechaObj.toLocaleDateString("es-ES", opciones);
  });
  const cantidadData = datosFiltrados.map((d) => d.cantidad);
  const totalImporte = datosFiltrados.map((d) => d.totalImporte);

  // Actualizar el gráfico
  chart.data.labels = labels;
  chart.data.datasets[0].data = cantidadData;
  chart.data.datasets[1].data = totalImporte;
  chart.update();
}

// Configuración inicial del gráfico
let chart = new Chart(ctx, {
  type: "bar",
  data: {
    labels: [],
    datasets: [
      {
        label: "Clientes",
        data: [],
        backgroundColor: "rgb(0, 200, 200)",
        yAxisID: "y",
        tension: 0.3,
        pointRadius: 1, 
        pointHoverRadius: 2,
        hitRadius: 1, 
      },
      {
        label: "Importe total sin IVA",
        data: [],
        backgroundColor: "rgb(200, 0, 255)",
        yAxisID: "y1",
        tension: 0.3,
        pointRadius: 5, 
        pointHoverRadius: 6, 
        hitRadius: 5,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
    hover: {
      mode: "nearest",
      intersect: true,
    },
    scales: {
      x: {
        ticks: { font: { size: 24 } }, // Aumenta el tamaño de las etiquetas del eje X
      },
      y: {
        beginAtZero: true,
        position: "left",
        title: { display: true, text: "", font: { size: 32 } },
        ticks: { font: { size: 24 } }, // Aumenta el tamaño del texto en el eje Y
      },
      y1: {
        beginAtZero: true,
        position: "right",
        title: { display: true, text: "", font: { size: 32 } },
        grid: { drawOnChartArea: false },
        ticks: { font: { size: 24 } }, // Aumenta el tamaño del texto en el eje Y derecho
      },
    },
    plugins: {
      legend: {
        labels: { font: { size: 34 } }, // Aumenta el tamaño del texto en la leyenda
      },
      tooltip: {
        bodyFont: { size: 24 }, // Aumenta el tamaño del tooltip
        titleFont: { size: 26 }, // Aumenta el tamaño del título del tooltip
      },
    },
  },
});

actualizarGrafico();

function mostrarDetalle() {
  let fecha1 = fechaDesde.value;
  let fecha2 = fechaHasta.value;
  guardarCargaJson();
  const panel = document.getElementById("detalle");
  panel.innerHTML = "";
  const cargasDelDia = cargas.filter(
    (c) => c.fecha >= fecha1 && c.fecha <= fecha2
  );

  if (cargasDelDia.length === 0) {
    panel.innerHTML = "<p>No hay datos para este día</p>";
    return;
  }

  let totalImporte = 0;
  let totalImporteSinIVA = 0;
  let totalClientes = 0;
  let totalRetBlanco = 0;

  cargasDelDia.forEach((carga) => {
    carga.data.forEach((cuenta) => {
      totalClientes++;
      cuenta.pedidos.forEach((pedido) => {
        pedido.lineas.forEach((linea) => {
          totalImporte += linea.importe;
          totalImporteSinIVA += linea.importe / 1.21;
          if (linea.retBlanco == "R. BLANCO") totalRetBlanco += 1;
        });
      });
    });
  });

  const resumen = document.createElement("div");
  resumen.innerHTML = `<h3>Resumen de ${fecha1} a ${fecha2}</h3>
    <p>Importe Total: ${totalImporte.toFixed(2)} € --
    Importe Sin IVA: ${totalImporteSinIVA.toFixed(2)} € --
    Total Clientes: ${totalClientes} --
    Total Retiradas de Blanco: ${totalRetBlanco}</p>`;
  panel.appendChild(resumen);

  cargasDelDia.forEach((carga) => {
    const cargaDiv = document.createElement("div");
    cargaDiv.innerHTML = `<h4><button style="width: 2em;" title="ELIMINAR" onclick="eliminarCarga('${carga.numero}')">X</button> - Carga ${carga.numero}</h4>`;
    carga.data.forEach((cuenta, cuentaIndex) => {
      const cuentaDiv = document.createElement("div");
      let auxCliente =
        `${cuenta.cuenta} ${cuenta.nombre} ----------------------------------------------------------------------------------------`.slice(
          0,
          50
        );
      cuentaDiv.innerHTML = `<strong style="background-color: aqua;"><button title="ELIMINAR" onclick="eliminarCuenta('${carga.numero}', ${cuentaIndex})">X</button> ----  ${auxCliente}</strong>`;
      cuenta.pedidos.forEach((pedido, pedidoIndex) => {
        let auxPedido =
          `------------------ ${pedido.pedido} -----------------------------------------------------------------`.slice(
            0,
            30
          );
        const pedidoDiv = document.createElement("div");
        pedidoDiv.innerHTML = `<b>${auxPedido}</b> <button title="ELIMINAR" onclick="eliminarPedido('${carga.numero}', ${cuentaIndex}, ${pedidoIndex})">X</button>`;
        pedido.lineas.forEach((linea, lineaIndex) => {
          let auxBlanco = linea.retBlanco;
          if (auxBlanco != "") auxBlanco = `Ret. Blanco: ${linea.retBlanco}`;
          let auxLinea =
            `------------------------------------------ ${linea.codigo} - ${linea.producto} - Importe: ${linea.importe} € - ${linea.entregasTotales} - ${auxBlanco} -----------------------------------------------------------------------------------------------------------------------`.slice(
              0,
              140
            );
          const lineaDiv = document.createElement("div");
          lineaDiv.innerHTML = `${auxLinea} <button title="ELIMINAR" onclick="eliminarLinea('${carga.numero}', ${cuentaIndex}, ${pedidoIndex}, ${lineaIndex})">X</button>`;
          pedidoDiv.appendChild(lineaDiv);
        });
        cuentaDiv.appendChild(pedidoDiv);
      });
      cargaDiv.appendChild(cuentaDiv);
    });
    panel.appendChild(cargaDiv);
  });
}

function ocultarDetalle() {
  document.getElementById("detalle").innerHTML = "";
}

function eliminarCarga(numero) {
  const index = cargas.findIndex((c) => c.numero === numero);
  if (index !== -1) {
    cargas.splice(index, 1);
    actualizarGrafico();
    ocultarDetalle();
  }
}

function eliminarCuenta(numero, cuentaIndex) {
  const carga = cargas.find((c) => c.numero === numero);
  if (carga) {
    carga.data.splice(cuentaIndex, 1);
    mostrarDetalle(carga.fecha);
  }
}

function eliminarPedido(numero, cuentaIndex, pedidoIndex) {
  const carga = cargas.find((c) => c.numero === numero);
  if (carga) {
    const cuenta = carga.data[cuentaIndex];
    if (cuenta) {
      cuenta.pedidos.splice(pedidoIndex, 1);
      mostrarDetalle(carga.fecha);
    }
  }
}

function eliminarLinea(numero, cuentaIndex, pedidoIndex, lineaIndex) {
  const carga = cargas.find((c) => c.numero === numero);
  if (carga) {
    const cuenta = carga.data[cuentaIndex];
    if (cuenta) {
      const pedido = cuenta.pedidos[pedidoIndex];
      if (pedido) {
        pedido.lineas.splice(lineaIndex, 1);
        mostrarDetalle(carga.fecha);
      }
    }
  }
}

function guardarCargaJson() {
  // Verificar si la carpeta existe, si no, crearla
  fs.mkdir(finalDocsPath, { recursive: true }, (err) => {
    if (err) {
      console.error("Error al crear la carpeta:", err);
    } else {
      console.log("Carpeta verificada o creada:", finalDocsPath);

      // Ahora se puede escribir el archivo
      fs.writeFile(filePath, JSON.stringify(cargas, null, 2), (err) => {
        if (err) {
          console.error("Error al guardar el archivo:", err);
        } else {
          console.log("Carga guardada en:", filePath);
        }
      });
    }
  });
}

function exportarExcel() {
  let fecha1 = fechaDesde.value;
  let fecha2 = fechaHasta.value;

  /* creamos workbook */
  var wb = XLSX.utils.book_new();
  wb.Props = {
    Title: `Transporte de ${fecha1} a ${fecha2}`,
    Subject: "Transporte",
    Author: "Conforama",
    CreatedDate: Date.now(),
  };
  wb.SheetNames.push("info");

  const cargasDelDia = cargas.filter(
    (c) => c.fecha >= fecha1 && c.fecha <= fecha2
  );

  /* modificamos la tabla oculta para añadirle la info */
  var table3_output = "";

  table3_output +=
    "<tr><td>Carga</td><td>Fecha</td><td>Pedido de ventas</td><td>Nombre</td><td>Calle</td><td>Ciudad</td><td>Código Postal</td><td>Teléfono</td><td>Correo electrónico</td><td>" +
    "Código de artículo</td><td>Nombre del producto</td><td>Sitio</td><td>Almacén</td><td>Cantidad del pedido</td><td>Total linea pedido</td><td>Resto a pagar Total del Pedoido" +
    "</td><td>Basic</td><td>Web Basic</td><td>Óptima</td><td>Web Óptima</td><td>Premium</td><td>Web Premium</td><td>Comentario</td><td>--</td></tr>";

  cargasDelDia.forEach((carga) => {
    carga.data.forEach((cuenta) => {
      cuenta.pedidos.forEach((pedido) => {
        pedido.lineas.forEach((linea) => {
          table3_output += `<tr><td>${carga.numero}</td><td>${carga.fecha}</td>
            <td>${pedido.pedido}</td><td>${cuenta.nombre}</td><td> 
            ${cuenta.calle}</td><td>${cuenta.ciudad}</td><td> 
            ${cuenta.cp}</td><td>${cuenta.telf}</td><td> 
            ${cuenta.email}</td><td>${linea.codigo}</td><td> 
            ${linea.producto}</td><td></td><td>${linea.almacen} </td><td>
            ${linea.cantDispData}</td><td>${linea.importe}  </td><td>
            ${pedido.dataResto}</td><td>${linea.basic2}</td><td> 
            ${linea.wbasic}</td><td>${linea.optima2}</td><td> 
            ${linea.woptima}</td><td>${linea.premium2}</td><td> 
            ${linea.wpremium}</td><td>${linea.comentario}</td></tr>`;
        });
      });
    });
  });

  document.getElementById("sheetjsMASINFO").innerHTML = table3_output;

  var tbl3 = document.getElementById("sheetjsMASINFO");

  /* create a worksheet and add table */
  ws = XLSX.utils.table_to_sheet(tbl3);

  /* adjustamos anchura columnas */
  ws["!cols"] = [
    {
      wch: 12,
    },
    {
      wch: 12,
    },
    {
      wch: 12,
    },
    {
      wch: 12,
    },
    {
      wch: 12,
    },
    {
      wch: 12,
    },
    {
      wch: 12,
    },
    {
      wch: 12,
    },
    {
      wch: 12,
    },
    {
      wch: 12,
    },
    {
      wch: 12,
    },
  ];

  /* creamos workbook y metemos worksheets */
  wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "INFO");

  /* export to file */
  console.log(finalDownloadPath);
  let excelpath = path.resolve(
    finalDownloadPath,
    `Transporte de ${fecha1} a ${fecha2}` + ".xlsx"
  );

  XLSX.writeFile(wb, excelpath, {
    compression: true,
  });

  alert(
    `Exportado, tienes el Excel en la carpeta de descargas, con el nombre "Transporte de ${fecha1} a ${fecha2}.xlsx"`
  );
}

mostrarDetalle();


function mostrarDia(num) {
  
  let desde = new Date();
  let hasta = new Date();

  //const desde = new Date();
  //const hasta = new Date();
  //desde.setDate(hoy.getDate() - 5);
  //hasta.setDate(hoy.getDate() + 5);

  switch (num) {
    case 1: // D+0
      break;

    case 2: // D+1
      desde.setDate(desde.getDate() + 1);
      hasta.setDate(hasta.getDate() + 1);
      break;

    case 3: // D+2
      desde.setDate(desde.getDate() + 2);
      hasta.setDate(hasta.getDate() + 2);
      break;

    case 4: // D+0+1+2
      hasta.setDate(hasta.getDate() + 2);
      break;

    case 5: // AYER D-1
      desde.setDate(desde.getDate() - 1);
      hasta.setDate(hasta.getDate() - 1);
      break;

    case 6: // QUINCENA D-15 -> D+0
      desde.setDate(desde.getDate() - 15);
      break;
  

    default:
      break;
  }
  desde = desde.toISOString().split("T")[0];
  hasta = hasta.toISOString().split("T")[0];
  fechaDesde.value = desde;
  fechaHasta.value = hasta;

  actualizarGrafico();
  mostrarDetalle();
}