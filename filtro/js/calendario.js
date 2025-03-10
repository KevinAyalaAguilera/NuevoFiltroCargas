const filePath = path.resolve(finalDocsPath, "cargas.json");
var cargas = {};
const daysOfWeek = ['<span style="color: red;">Domingo</span>', "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

try {
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf8");
    cargas = JSON.parse(data); // Devuelve los datos como objeto
  }
} catch (err) {
  console.error("Error al leer el archivo:", err);
  cargas = { almacenes: [], checkboxes: {} }; // Datos por defecto
}

mostrarDia(-7);
mostrarDia(-6);
mostrarDia(-5);
mostrarDia(-4);
mostrarDia(-3);
mostrarDia(-2);
mostrarDia(-1);

mostrarDia(0);

mostrarDia(1);
mostrarDia(2);
mostrarDia(3);
mostrarDia(4);
mostrarDia(5);
mostrarDia(6);
mostrarDia(7);

function mostrarDia(dia) {
  const today = new Date();
  today.setDate(today.getDate() + dia);
  const formattedDate = today.toISOString().split("T")[0];
  let show = "";

  cargasDeEsteDia = [];

  let totalClientesDia = 0;
  let totalImporteCarga = 0;

  cargas.forEach((carga) => {
    if (carga.fecha == formattedDate) {
      let totalClientes = 0;
      let totalPedidos = 0;
      let totalImporte = 0;
      let totalRetiradasBlanco = 0;

      carga.data.forEach((cuenta) => {
        totalClientes++;
        totalClientesDia++;
        cuenta.pedidos.forEach((pedido) => {
          totalPedidos++;
          pedido.lineas.forEach((linea) => {
            totalImporteCarga += linea.importe;
            totalImporte += linea.importe;
            totalRetiradasBlanco += linea.retBlanco;
          });
        });
      });

      totalImporte = totalImporte.toFixed(0);
      totalImporteNoIva = (totalImporte / 1.21).toFixed(0);

      let stringCarga =
        "<p>" +
        carga.numero +
        " - clientes " +
        totalClientes +
        " - pedidos " +
        totalPedidos +
        " - importe " +
        totalImporte +
        " € - sin IVA " +
        totalImporteNoIva +
        " € - retiradas blanco " +
        totalRetiradasBlanco +
        "</p>";
      cargasDeEsteDia.push(stringCarga);
    }
  });

  let totalImporteCargaNoIva = 0;
  totalImporteCarga = totalImporteCarga.toFixed(0);
  totalImporteCargaNoIva = (totalImporteCarga / 1.21).toFixed(0);

  show += `<details>`;
  show += `<summary><b>`;
  if (dia == 0) show += `(HOY) `;
  show +=
    `${formattedDate}` + " " + daysOfWeek[today.getDay()] +
    "</b> - clientes " +
    totalClientesDia +
    " - importe " +
    totalImporteCarga +
    " € - sin IVA " +
    totalImporteCargaNoIva + " €";
  show += `</summary>`;

  cargasDeEsteDia.forEach((element) => {
    show += element;
  });

  show += `</details>`;
  document.getElementById("listado").innerHTML += show;
}
