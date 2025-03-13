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

function generarCalendario() {
  const hoy = new Date("2025-03-13");
  const contenedor = document.getElementById("calendario");
  contenedor.innerHTML = "";
  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  for (let i = -7; i <= 7; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + i);
    const fechaStr = fecha.toISOString().split("T")[0];
    const diaSemana = diasSemana[fecha.getDay()];

    const totalClientes = cargas
      .filter(c => c.fecha === fechaStr)
      .reduce((sum, c) => sum + c.data.length, 0);

    const dia = document.createElement("div");
    dia.className = "dia";
    if (fechaStr === "2025-03-13") {
      dia.style.fontWeight = "bold";
    }
    dia.innerText = `${diaSemana} ${fechaStr} - Clientes: ${totalClientes}`;
    dia.onclick = () => mostrarDetalle(fechaStr);
    contenedor.appendChild(dia);
  }
}

generarCalendario();

function mostrarDetalle(fecha) {
  guardarCargaJson();
  const panel = document.getElementById("detalle");
  panel.innerHTML = "";
  const cargasDelDia = cargas.filter(c => c.fecha === fecha);

  if (cargasDelDia.length === 0) {
    panel.innerHTML = "<p>No hay datos para este día</p>";
    return;
  }

  let totalImporte = 0;
  let totalImporteSinIVA = 0;
  let totalClientes = 0;
  let totalRetBlanco = 0;

  cargasDelDia.forEach(carga => {
    carga.data.forEach(cuenta => {
      totalClientes++;
      cuenta.pedidos.forEach(pedido => {
        pedido.lineas.forEach(linea => {
          totalImporte += linea.importe;
          totalImporteSinIVA += linea.importe * 0.79;
          totalRetBlanco += linea.retBlanco;
        });
      });
    });
  });

  const resumen = document.createElement("div");
  resumen.innerHTML = `<h3>Resumen del ${fecha}</h3>
    <p>Importe Total: ${totalImporte.toFixed(2)} €</p>
    <p>Importe Sin IVA: ${totalImporteSinIVA.toFixed(2)} €</p>
    <p>Total Clientes: ${totalClientes}</p>
    <p>Total Ret Blanco: ${totalRetBlanco}</p>`;
  panel.appendChild(resumen);

  cargasDelDia.forEach((carga) => {
    const cargaDiv = document.createElement("div");
    cargaDiv.innerHTML = `<h4 style="background-color: rgb(0, 0, 100); color: white;">Carga ${carga.numero} <button style="color: white;" onclick="eliminarCarga('${carga.numero}')">Eliminar</button></h4>`;
    carga.data.forEach((cuenta, cuentaIndex) => {
      const cuentaDiv = document.createElement("div");
      cuentaDiv.innerHTML = `<strong style="background-color: rgb(230, 230, 255);">${cuenta.cuenta} ${cuenta.nombre}<button onclick="eliminarCuenta('${carga.numero}', ${cuentaIndex})">Eliminar</button></strong>`;
      cuenta.pedidos.forEach((pedido, pedidoIndex) => {
        const pedidoDiv = document.createElement("div");
        pedidoDiv.innerHTML = `<em><b>${pedido.pedido}</b> <button onclick="eliminarPedido('${carga.numero}', ${cuentaIndex}, ${pedidoIndex})">Eliminar</button></em>`;
        pedido.lineas.forEach((linea, lineaIndex) => {
          const lineaDiv = document.createElement("div");
          lineaDiv.innerHTML = `${linea.codigo} - ${linea.producto} - Importe: ${linea.importe} € <button onclick="eliminarLinea('${carga.numero}', ${cuentaIndex}, ${pedidoIndex}, ${lineaIndex})">Eliminar</button>`;
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
  const index = cargas.findIndex(c => c.numero === numero);
  if (index !== -1) {
    cargas.splice(index, 1);
    generarCalendario();
    ocultarDetalle();
  }
}

function eliminarCuenta(numero, cuentaIndex) {
  const carga = cargas.find(c => c.numero === numero);
  if (carga) {
    carga.data.splice(cuentaIndex, 1);
    mostrarDetalle(carga.fecha);
  }
}

function eliminarPedido(numero, cuentaIndex, pedidoIndex) {
  const carga = cargas.find(c => c.numero === numero);
  if (carga) {
    const cuenta = carga.data[cuentaIndex];
    if (cuenta) {
      cuenta.pedidos.splice(pedidoIndex, 1);
      mostrarDetalle(carga.fecha);
    }
  }
}

function eliminarLinea(numero, cuentaIndex, pedidoIndex, lineaIndex) {
  const carga = cargas.find(c => c.numero === numero);
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