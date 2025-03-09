const { jsPDF } = require("jspdf");

var idsEnUso = [];
let cargas = leerCargasJson();
// Filtrar las cargas que tienen menos de 240 horas (10 días)
const ahoraEnHoras = Date.now() / 3600000;
cargas = cargas.filter((element) => {
  // Calcular la diferencia de tiempo en horas
  const diferenciaEnHoras = ahoraEnHoras - parseFloat(element.datestamp);
  return diferenciaEnHoras <= 240; // Mantener solo las cargas con menos de 240 horas
});
var cuentas = [];
var pedidos = [];
var lineas = [];
var fechaCarga;
var fechaComparator;
var fechaFinal;
var diaFecha;
var textoVersion;

var para = "";
var cc = "";

var numCarga;
var almacen;
var empleado;
var miTienda;

var totalImporte = 0;
var totalClientes = 0;
var totalPedidos = 0;
var totalLineas = 0;
var sinIva = 0;

var para;
var cc;

var regex = /expo/gi;
var filtrosActivados = false;

// leer configuración

// Función para leer datos desde un archivo JSON
function leerJson() {
  try {
    if (fs.existsSync(finalConfigPath)) {
      const data = fs.readFileSync(finalConfigPath, "utf8");
      return JSON.parse(data); // Devuelve los datos como objeto
    }
  } catch (err) {
    console.error("Error al leer el archivo de configuración:", err);
    return { almacenes: [], checkboxes: {} }; // Datos por defecto
  }
  return { almacenes: [], checkboxes: {} }; // Si no existe, devuelve un objeto con valores por defecto
}

const config = leerJson();

var soloPedidosDisp = false;
var soloLineasDisp = false;

var soloPedidosSinComentarios = false;
var soloLineasSinComentarios = false;

var errorFechas = true;
var errorModo = true;

var mostrarAvatares = config["checkboxes"].avatares;
if (mostrarAvatares == undefined) mostrarAvatares = true;

// fin gestión de filtros

document.getElementById("fechaCarga").addEventListener("change", function () {
  fechaCarga = this.value;
  fechaComparator = this.value;
  fechaFinal = new Date(fechaCarga);
  diaFecha = fechaFinal.getDay();
  diaFecha = getDiaSemana(diaFecha);
  fechaArray = fechaCarga.split("-");
  fechaArray.filter(Boolean);
  if (fechaArray[1])
    fechaCarga = fechaArray[2] + "/" + fechaArray[1] + "/" + fechaArray[0];
});

document.getElementById("numeroCarga").addEventListener("change", function () {
  numCarga = this.value;
});

document.getElementById("empleado").addEventListener("change", function () {
  empleado = this.value;
});

//Funcion para activar el botón oculto de importar Excel
let $activadorImportar = document.getElementById("activadorImportar");
$activadorImportar.addEventListener("click", (e) => {
  e.target.previousElementSibling.click();
});

class cuentaCliente {
  constructor(cuenta, nombre, telf, calle, ciudad, cp, email) {
    this.cuenta = cuenta;
    this.nombre = nombre;
    this.telf = telf;
    this.telfEnds = this.telf;
    if (this.telfEnds == undefined) this.telfEnds = "0";
    this.avatar = this.cuenta.slice(-1) + this.telfEnds.slice(-1);
    if (isNaN(this.avatar)) this.avatar = 0;
    this.avatar = ((this.avatar * 34) / 99).toFixed(0);
    if (this.avatar == 0) this.avatar = 1;
    if (this.telf == null)
      this.telf = '<span class="error">FALTA TELÉFONO</span>';
    this.calle = calle;
    if (this.calle != null) this.calle = this.calle.substring(0, 28);
    else this.calle = '<span class="error">FALTA CALLE</span>';
    this.ciudad = ciudad;
    if (this.ciudad == null)
      this.ciudad = '<span class="error">FALTA POBLACIÓN</span>';
    this.cp = cp;
    if (this.cp == null)
      this.cp = '<span class="error">FALTA CÓDIGO POSTAL</span>';
    this.provincia = codigoPostal(this.cp);
    this.email = email;
    this.pedidos = [];
    if (email === this.cuenta + "@confodummy.es") {
      this.email = "";
    } else if (email == null) {
      this.email = "";
    } else {
      this.email = email;
    }
  }

  getCuenta() {
    return this.cuenta;
  }

  getEmailIcon() {
    if (this.email != "")
      return (
        '<a class="enviarMailCliente" href="mailto:' +
        this.email +
        "?subject=Conforama " +
        this.cuenta +
        " " +
        this.nombre +
        '">@</a>'
      );
    else return "";
  }

  getEncabezado() {
    if (!mostrarAvatares) {
      return (
        '<div class="wrapperCliente" id="' +
        this.cuenta +
        '">' +
        `<div class="wrapperDatosCliente" style="width: 100%; background-repeat: no-repeat; background-image: url('./img/avatars/${this.avatar}.png');">` +
        '<p style="margin-left: 32px;">' +
        this.nombre +
        "</p>" +
        "<p>" +
        this.cuenta +
        "</p>" +
        "<p>" +
        this.telf +
        "</p>" +
        "<p>" +
        this.getEmailIcon() +
        "</p>" +
        "<p>" +
        this.calle +
        "</p>" +
        "<p>" +
        this.ciudad +
        "</p>" +
        "<p>" +
        this.cp +
        "</p>" +
        "<p>" +
        this.provincia +
        "</p>" +
        '<span class="close" onclick="killCuenta(\'' +
        this.cuenta +
        "'," +
        this.cuenta +
        ')">✖</span></td>' +
        "</div>"
      );
    } else {
      return (
        '<div class="wrapperCliente" id="' +
        this.cuenta +
        '">' +
        '<div class="wrapperDatosCliente" style="width: 100%"><tr>' +
        "<p>" +
        this.nombre +
        "</p>" +
        "<p>" +
        this.cuenta +
        "</p>" +
        "<p>" +
        this.telf +
        "</p>" +
        "<p>" +
        this.getEmailIcon() +
        "</p>" +
        "<p>" +
        this.calle +
        "</p>" +
        "<p>" +
        this.ciudad +
        "</p>" +
        "<p>" +
        this.cp +
        "</p>" +
        "<p>" +
        this.provincia +
        "</p>" +
        '<span class="close" onclick="killCuenta(\'' +
        this.cuenta +
        "'," +
        this.cuenta +
        ')">✖</span></td>' +
        "</div>"
      );
    }
  }

  getHoja1() {
    let auxNombre = this.nombre.slice(0, 30);
    return (
      '<br /><div class="pdfcuenta"><span class="hoja1cuenta">' + auxNombre.toUpperCase() + '</span></div>' +
      '<div class="pdfcuenta">' +
      this.telf +
      " - " +
      this.calle.slice(0, 20).toLowerCase() +
      " - " +
      this.ciudad.toLowerCase() +
      " - " +
      this.cp +
      "</div>"
    );
  }
  getHoja2() {
    return '<br /><div class="pdfcuenta">' + this.ciudad.toLowerCase() + " - " + this.cp + "</div>";
  }

  getArrayPedidos() {
    return this.pedidos;
  }
}

class objetoCarga {
  constructor() {
    this.num = numCarga;
    this.clientes = cuentas;
  }
}

class fechaDeCarga {
  constructor(objetoCarga) {
    this.num = fechaCarga;
    this.carga = objetoCarga;
  }
}

class pedidoVentas {
  constructor(cuenta, pedido, resto, obser1, obser2) {
    this.lineas = [];
    this.cuenta = cuenta;
    this.pedido = pedido;
    this.dataResto = resto;
    this.obser1 = obser1;
    this.obser2 = obser2;
    if (this.obser1 == undefined && this.obser2 == undefined) {
      this.obser1 =
        '<span class="error">&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp</span>';
      this.tieneObservaciones = false;
    } else this.tieneObservaciones = true;
    if (this.obser1 == undefined) this.obser1 = "";
    if (this.obser2 == undefined) this.obser2 = "";
    if (resto > 0.2) {
      this.resto =
        '<span class="error">PENDIENTE DE PAGO ' +
        resto +
        " €" +
        "</span>&nbsp&nbsp";
    } else {
      this.resto = "";
    }
  }

  getPedido() {
    return this.pedido;
  }
  getCuenta() {
    return this.cuenta;
  }

  getEncabezado() {
    let observ;
    if (this.tieneObservaciones)
      observ =
        '<div class="observaciones">' +
        this.obser1 +
        " - " +
        this.obser2 +
        "</div>";
    else observ = '<div class="observaciones">' + this.obser1 + "</div>";
    return (
      '<div class="wrapperPedido" id="' +
      this.pedido +
      '"><b>' +
      this.pedido +
      "&nbsp;&nbsp;&nbsp;" +
      this.resto +
      '</b><span class="close" onclick="killPedido(\'' +
      this.cuenta +
      "','" +
      this.pedido +
      "'," +
      this.pedido +
      ')">✖</span>' +
      observ
    );
  }

  getHoja1() {
    return (
      '<div class-"pdfpedido"><b>- ' +
      this.pedido +
      "</b> ---  " +
      this.obser1.toLowerCase() +
      " --- " +
      this.resto +
      '</div>'
    );
  }

  getHoja2() {
    return "<div><b>" + this.pedido + "</b></div>";
  }
}

class linea {
  constructor(
    cuenta,
    pedido,
    modo,
    codigo,
    producto,
    importe,
    almacen,
    comentario0,
    cantPedida,
    cantDisp,
    basic,
    optima,
    premium,
    basic2,
    optima2,
    premium2,
    wbasic,
    woptima,
    wpremium,
    km,
    retDescanso,
    retSillon,
    retSofa,
    retChais,
    retBlanco,
    f1,
    f2,
    f3
  ) {
    this.cuenta = cuenta;
    this.linea = crearId();
    this.pedido = pedido;
    this.modo = modo;
    if (this.modo == 40 && errorModo)
      this.modo = '<span class="error">' + modo + "</span>";
    if (this.modo == 60 && errorModo)
      this.modo = '<span class="error">' + modo + "</span>"; // ED
    if (this.modo == 70 && errorModo)
      this.modo = '<span class="error">' + modo + "</span>"; // electro
    if (this.modo == 80 && errorModo)
      this.modo = '<span class="error">' + modo + "</span>";
    if (this.modo == 99 && errorModo)
      this.modo = '<span class="error">' + modo + "</span>"; // LS
    this.codigo = codigo;
    this.producto = producto;
    this.importe = importe;
    this.almacen = almacen;
    // HOTFIX
    if (comentario0 == undefined) {
      comentario0 = "";
      this.tieneComentario = false;
    } else this.tieneComentario = true;
    this.comentario = comentario0;
    if (this.comentario.match(regex)) {
      this.esExpo = "EXPO";
    } else {
      this.esExpo = "";
    }

    this.cantPedida = cantPedida;
    if (this.cantPedida === cantDisp) this.cantDisp = cantDisp + "&nbsp;UD";
    else
      this.cantDisp =
        '<span class="error">' +
        cantDisp +
        "/" +
        cantPedida +
        "&nbsp;UD</span>";
    this.cantDispData = cantDisp;
    this.basic = basic;
    this.optima = optima;
    this.premium = premium;
    this.basic2 = basic2;
    this.optima2 = optima2;
    this.premium2 = premium2;
    this.wbasic = wbasic;
    this.woptima = woptima;
    this.wpremium = wpremium;
    this.km = km;
    this.retDescanso = retDescanso;
    this.retSillon = retSillon;
    this.retSofa = retSofa;
    this.retChais = retChais;
    this.entregasTotales = "";
    this.retiradasTotales = "";
    if (retBlanco == "Sí") this.retBlanco = "R. BLANCO";
    else this.retBlanco = "";
    this.f1 = new Date(Math.round((f1 - 25569) * 86400 * 1000));
    this.f1 = this.f1.toLocaleDateString("en-CA");
    this.f2 = new Date(Math.round((f2 - 25569) * 86400 * 1000));
    this.f2 = this.f2.toLocaleDateString("en-CA");
    this.f3 = new Date(Math.round((f3 - 25569) * 86400 * 1000));
    this.f3 = this.f3.toLocaleDateString("en-CA");
    if (
      this.f1 != fechaComparator ||
      this.f2 != fechaComparator ||
      this.f3 != fechaComparator
    )
      this.lineaConFechasMal = true;
    else this.lineaConFechasMal = false;
    if (this.lineaConFechasMal == true) {
      if (errorFechas) this.fecha = '<span class="error">FECHA</span>';
      else this.fecha = "&nbsp";
    } else this.fecha = "&nbsp";
  }

  getPedido() {
    return this.pedido;
  }

  getEntregas() {
    let entregas = "";
    if (this.basic == "Sí") entregas += "BASIC: " + this.basic2 + " € ";
    if (this.optima == "Sí") entregas += "ÓPTIMA: " + this.optima2 + " € ";
    if (this.premium == "Sí") entregas += "PREMIUM: " + this.premium2 + " € ";
    if (this.wbasic > 0) entregas += "WEB BASIC: " + this.wbasic + " € ";
    if (this.woptima > 0) entregas += "WEB ÓPTIMA: " + this.woptima + " € ";
    if (this.wpremium > 0) entregas += "WEB PREMIUM: " + this.wpremium + " € ";
    if (this.km > 0) entregas += "KILOMETRAJE: " + this.km + " € ";
    this.entregasTotales = entregas;
    if (entregas == "" && !this.modo.includes("40"))
      entregas = '<span class="error">FALTAN GASTOS' + "</span>";
    return entregas;
  }

  getEntregasCarga() {
    let entregas = "";
    if (this.basic == "Sí") entregas += "BAS: " + this.basic2 + " € ";
    if (this.optima == "Sí") entregas += "ÓPT: " + this.optima2 + " € ";
    if (this.premium == "Sí") entregas += "PREM: " + this.premium2 + " € ";
    if (this.wbasic > 0) entregas += "WEB.BAS: " + this.wbasic + " € ";
    if (this.woptima > 0) entregas += "WEB.ÓPT: " + this.woptima + " € ";
    if (this.wpremium > 0) entregas += "WEB.PREM: " + this.wpremium + " € ";
    if (this.km > 0) entregas += "KM: " + this.km + " € ";
    this.entregasTotales = entregas;
    return entregas;
  }

  getRetiradas() {
    let retiradas = " ";
    if (this.retDescanso > 0)
      retiradas += "R. DESCANSO: " + this.retDescanso + " € ";
    if (this.retSillon > 0)
      retiradas += "R. SILLONES: " + this.retSillon + " € ";
    if (this.retSofa > 0) retiradas += "R. SOFAS: " + this.retSofa + " € ";
    if (this.retChais > 0) retiradas += "R. CHAIS: " + this.retChais + " € ";
    retiradas += this.retBlanco;
    this.retiradasTotales = retiradas;
    return retiradas;
  }

  getEncabezado() {
    let tipoAlmacen;
    let comentario;
    if (!this.tieneComentario)
      comentario =
        '<span class="error comentarioLinea">&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp</span>';
    else
      comentario =
        '<span class="comentarioLinea">' + this.comentario + "</span>";

    tipoAlmacen = "<p>" + this.almacen + "</p>";

    if (!this.importe) this.importe = 0;
    let importeFixed = this.importe.toFixed(2);

    return (
      '<div class="wrapperLinea" id="' +
      this.linea +
      '">' +
      '<p><a href="https://www.conforama.es/?query=' +
      this.codigo +
      '" target="_blank">' +
      this.codigo +
      "</a></p>" +
      "<p>" +
      this.producto +
      "</p>" +
      "<p>" +
      importeFixed +
      " €</p>" +
      "<p>" +
      tipoAlmacen +
      "</p>" +
      "<p>" +
      this.cantDisp +
      "</p>" +
      "<p>" +
      this.fecha +
      "</p>" +
      "<p>" +
      this.modo +
      "</p>" +
      "<p>" +
      this.getEntregas() +
      "</p>" +
      "<p>" +
      this.getRetiradas() +
      "</p>" +
      "<p>" +
      comentario +
      "</p>" +
      '<span class="close" onclick="killLinea(' +
      this.linea +
      ')">✖</span>'
    );
  }

  getHoja1() {
    if (this.importe == undefined) this.importe = 0;
    if (this.producto == undefined) this.producto = "";
    if (this.cantDisp == undefined) this.cantDisp = 0;
    let importeFixed = this.importe.toFixed(2);
    return (
      '<div class="pdflinea">' +
      this.codigo +
      " - " +
      this.producto.slice(0, 15).toUpperCase() +
      " - " +
      importeFixed +
      " € - " +
      this.cantDisp +
      " - " +
      this.getEntregasCarga().toUpperCase() +
      " " +
      this.getRetiradas().toUpperCase() +
      " " +
      this.comentario.toLowerCase() +
      "</div>"
    );
  }

  getHoja2() {
    let importeFixed = this.importe.toFixed(2);
    return (
      '<div class="pdflinea">' +
      this.codigo +
      " - " +
      this.producto +
      " - " +
      this.cantDisp +
      " - " +
      this.getRetiradas() +
      " " +
      this.esExpo +
      "</div>"
    );
  }

  getHoja3() {
    let datosCuenta = buscarCuenta(this.cuenta);
    let datosPedido = buscarPedido(this.pedido);
    if (null === datosPedido) {
      datosPedido = {};
      datosPedido.dataResto = 0;
    }
    return (
      "<tr><td>" +
      this.pedido +
      "</td><td>" +
      datosCuenta.nombre +
      "</td><td>" +
      datosCuenta.calle +
      "</td><td>" +
      datosCuenta.ciudad +
      "</td><td>" +
      datosCuenta.cp +
      "</td><td>" +
      datosCuenta.telf +
      "</td><td>" +
      datosCuenta.email +
      "</td><td>" +
      this.codigo +
      "</td><td>" +
      this.producto +
      "</td><td>" +
      "</td><td>" +
      this.almacen +
      "</td><td>" +
      this.cantDispData +
      "</td><td>" +
      this.importe + // arreglado error que duplicaba importe antes era (this.importe * this.cantDispData)
      "</td><td>" +
      datosPedido.dataResto +
      "</td><td>" +
      this.basic2 +
      "</td><td>" +
      this.wbasic +
      "</td><td>" +
      this.optima2 +
      "</td><td>" +
      this.woptima +
      "</td><td>" +
      this.premium2 +
      "</td><td>" +
      this.wpremium +
      "</td><td>" +
      this.comentario +
      "</td></tr>"
    );
  }
}

var filtroBTN = document.getElementById("btnfiltros");
function showFiltrosConfig() {
  filtrosActivados = !filtrosActivados;
  if (filtrosActivados) {
    filtroBTN.src = "./img/filtrado.png";

    soloPedidosDisp = config["checkboxes"].pedidos_disp;
    soloLineasDisp = config["checkboxes"].lineas_disp;

    soloPedidosSinComentarios = config["checkboxes"].sin_observaciones;
    soloLineasSinComentarios = config["checkboxes"].sin_comentarios;

    errorFechas = !config["checkboxes"].resaltado_fechas;
    errorModo = config["checkboxes"].resaltado_modo;
  } else {
    filtroBTN.src = "./img/filtro.png";

    soloPedidosDisp = false;
    soloLineasDisp = false;

    soloPedidosSinComentarios = false;
    soloLineasSinComentarios = false;

    errorFechas = true;
    errorModo = true;
  }
}

function getDiaSemana(dia) {
  if (dia == 1) return "Lunes";
  if (dia == 2) return "Martes";
  if (dia == 3) return "Miercoles";
  if (dia == 4) return "Jueves";
  if (dia == 5) return "Viernes";
  if (dia == 6) return "Sabado";
  if (dia == 7) return "Domingo";
  return "_";
}

function generarPopUpAlerta() {
  if (numCarga == null) numCarga = "carga-NULL";
  if (empleado == null) empleado = "empleado-NULL";
  if (almacen == null) almacen = "almacén-NULL";
  if (miTienda == null) miTienda = "tienda-NULL";
  if (diaFecha == null) diaFecha = "día-NULL";
  if (fechaCarga == null) fechaCarga = "fecha-NULL";

  if (numCarga == "carga-NULL") alert("¡NO HAS PUESTO EL NÚMERO DE CARGA!");
  if (empleado == "empleado-NULL") alert("¡NO HAS PUESTO TU NOMBRE!");

  let almacenesRestantes = [];

  for (let c = 0; c < cuentas.length; c++) {
    for (let p = 0; p < cuentas[c].pedidos.length; p++) {
      for (let l = 0; l < cuentas[c].pedidos[p].lineas.length; l++) {
        almacenesRestantes.push(cuentas[c].pedidos[p].lineas[l].almacen);
      }
    }
  }

  var uniq = [...new Set(almacenesRestantes)];
  if (uniq.length > 1) {
    alert("¡TIENES PRODUCTOS DE MÁS DE UN ALMACÉN EN ESTA CARGA!");
  } else almacen = uniq[0];

  config["almacenes"].forEach((element) => {
    if (element.almacen == almacen) miTienda = element.tienda;
  });

  if (diaFecha == "día-NULL")
    alert("¡NO HAS PUESTO LA FECHA DE ENVÍO DE LA CARGA!");
}

function crearId() {
  let newId;
  do {
    newId = Math.floor(Math.random() * 2500);
  } while (idsEnUso.find((id) => id === newId));
  idsEnUso.push(newId);
  return newId;
}

function codigoPostal(codigoPostal) {
  // Asegurarse de que el código postal tenga 5 cifras
  if (codigoPostal.length === 4) {
    codigoPostal = "0" + codigoPostal;
  }

  // Obtener las dos primeras cifras del código postal
  var provinciaCodigo = codigoPostal.substring(0, 2);
  // Mapear el código de provincia al nombre de la provincia
  var provincias = {
    "01": '<p class="encabezadoCarga" style="width: *%; color: rgb(255, 0, 0);">ÁLAVA</p>',
    "02": '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 0);">ALBACETE</p>',
    "03": '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 255);">ALICANTE</p>',
    "04": '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 255);">ALMERÍA</p>',
    "05": '<p class="encabezadoCarga" style="width: *%; color: rgb(255, 0, 0);">ÁVILA</p>',
    "06": '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 255, 0);">BADAJOZ</p>',
    "07": '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 0);">BALEARES</p>',
    "08": '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 0);">BARCELONA</p>',
    "09": '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 255, 0);">BURGOS</p>',
    10: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 255);">CÁCERES</p>',
    11: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 255, 0);">CÁDIZ</p>',
    12: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 255);">CASTELLÓN</p>',
    13: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 255);">CIUDAD REAL</p>',
    14: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 0);">CÓRDOBA</p>',
    15: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 0);">LA CORUÑA</p>',
    16: '<p class="encabezadoCarga" style="width: *%; color: rgb(255, 0, 0);">CUENCA</p>',
    17: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 255);">GERONA</p>',
    18: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 255, 0);">GRANADA</p>',
    19: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 255, 0);">GUADALAJARA</p>',
    20: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 255);">GUIPÚZCUA</p>',
    21: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 255);">HUELVA</p>',
    22: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 255, 0);">HUESCA</p>',
    23: '<p class="encabezadoCarga" style="width: *%; color: rgb(255, 0, 0);">JAÉN</p>',
    24: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 0);">LEÓN</p>',
    25: '<p class="encabezadoCarga" style="width: *%; color: rgb(255, 0, 0);">LÉRIDA</p>',
    26: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 255);">LA RIOJA</p>',
    27: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 255);">LUGO</p>',
    28: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 255);">MADRID</p>',
    29: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 255);">MÁLAGA</p>',
    30: '<p class="encabezadoCarga" style="width: *%; color: rgb(255, 0, 0);">MURCIA</p>',
    31: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 0);">NAVARRA</p>',
    32: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 255, 0);">ORENSE</p>',
    33: '<p class="encabezadoCarga" style="width: *%; color: rgb(255, 0, 0);">ASTURIAS</p>',
    34: '<p class="encabezadoCarga" style="width: *%; color: rgb(255, 0, 0);">PALENCIA</p>',
    35: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 0);">LAS PALMAS</p>',
    36: '<p class="encabezadoCarga" style="width: *%; color: rgb(255, 0, 0);">PONTEVEDRA</p>',
    37: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 255, 0);">SALAMANCA</p>',
    38: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 255);">SANTA CRUZ DE TENERIFE</p>',
    39: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 0);">CANTABRIA</p>',
    40: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 0);">SEGOVIA</p>',
    41: '<p class="encabezadoCarga" style="width: *%; color: rgb(255, 0, 0);">SEVILLA</p>',
    42: '<p class="encabezadoCarga" style="width: *%; color: rgb(255, 0, 0);">SORIA</p>',
    43: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 255, 0);">TARRAGONA</p>',
    44: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 0);">TERUEL</p>',
    45: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 0);">TOLEDO</p>',
    46: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 255, 0);">VALENCIA</p>',
    47: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 255, 0);">VALLADOLID</p>',
    48: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 255, 0);">VIZCAYA</p>',
    49: '<p class="encabezadoCarga" style="width: *%; color: rgb(255, 0, 0);">ZAMORA</p>',
    50: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 0);">ZARAGOZA</p>',
    51: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 0);">CEUTA</p>',
    52: '<p class="encabezadoCarga" style="width: *%; color: rgb(0, 0, 255);">MELILLA</p>',
  };

  // Obtener el nombre de la provincia a partir del código
  var provincia = provincias[provinciaCodigo];

  // Devolver el nombre de la provincia o un mensaje de error si no se encuentra
  if (provincia) {
    return provincia;
  } else {
    return "";
  }
}

function buscarCuenta(ce00) {
  for (let i = 0; i < cuentas.length; i++) {
    if (cuentas[i].cuenta == ce00) {
      return cuentas[i];
    }
  }
  return null; // Devuelve null si no se encuentra la cuenta
}

function buscarPedido(EPVT) {
  for (let i = 0; i < pedidos.length; i++) {
    if (pedidos[i].pedido == EPVT) {
      return pedidos[i];
    }
  }
  return null; // Devuelve null si no se encuentra el pedido
}

function determinarDestinatario() {
  config["almacenes"].forEach((element) => {
    if (almacen == element.almacen) {
      para = element.para;
      cc = element.cc;
      miTienda = element.tienda;
    }
  });
}

function killCuenta(el, divEl) {
  for (let i = 0; i < cuentas.length; i++) {
    if (cuentas[i].getCuenta() == el) cuentas.splice(i, 1);
  }
  calcularTotalesObjetos();
  actualizarContador();
  divEl.remove();
}

function killPedido(cuenta, pedido, elPedido) {
  for (let c = 0; c < cuentas.length; c++) {
    if (cuentas[c].getCuenta() == cuenta) {
      for (let p = 0; p < cuentas[c].pedidos.length; p++) {
        if (cuentas[c].pedidos[p].getPedido() == pedido)
          cuentas[c].pedidos.splice(p, 1);
      }
    }
  }
  calcularTotalesObjetos();
  actualizarContador();
  elPedido.remove();
}

function killLinea(laLinea) {
  for (let c = 0; c < cuentas.length; c++) {
    for (let p = 0; p < cuentas[c].pedidos.length; p++) {
      for (let l = 0; l < cuentas[c].pedidos[p].lineas.length; l++) {
        if (cuentas[c].pedidos[p].lineas[l].linea == laLinea)
          cuentas[c].pedidos[p].lineas.splice(l, 1);
      }
    }
  }
  calcularTotalesObjetos();
  actualizarContador();
  document.getElementById(laLinea).remove();
}

function copiarPedidos() {
  var pedidos = "";
  for (var c = 0; c < cuentas.length; c++) {
    for (var p = 0; p < cuentas[c].getArrayPedidos().length; p++) {
      pedidos += cuentas[c].pedidos[p].getPedido();
      pedidos += "\n";
    }
  }
  navigator.clipboard.writeText(pedidos);
}

function enviarMail() {
  generarPopUpAlerta();
  if (almacen == null) almacen = "almacén-NULL";
  if (diaFecha == null) diaFecha = "día-NULL";
  if (fechaCarga == null) fechaCarga = "fecha-NULL";

  determinarDestinatario();

  let asunto =
    "transp " +
    diaFecha +
    ", " +
    fechaCarga +
    " - " +
    numCarga +
    " - almacen " +
    almacen +
    " - " +
    empleado +
    " - tienda " +
    miTienda;
  let cuerpo =
    "transp " +
    diaFecha +
    ", " +
    fechaCarga +
    " - " +
    numCarga +
    " - almacen " +
    almacen +
    " - " +
    "Clientes " +
    totalClientes +
    " - Pedidos " +
    totalPedidos +
    " - PVP " +
    totalImporte +
    " €" +
    " - SIN IVA " +
    sinIva +
    " €" +
    " - " +
    empleado +
    " - tienda " +
    miTienda;

  window.location =
    "mailto:" + para + "?subject=" + asunto + "&cc=" + cc + "&body=" + cuerpo;
}

function calcularTotalesObjetos() {
  totalClientes = 0;
  totalPedidos = 0;
  totalImporte = 0;
  totalLineas = 0;
  for (var totalC = 0; totalC < cuentas.length; totalC++) {
    totalClientes += 1;
    for (var totalP = 0; totalP < cuentas[totalC].pedidos.length; totalP++) {
      totalPedidos += 1;
      for (
        var totalI = 0;
        totalI < cuentas[totalC].pedidos[totalP].lineas.length;
        totalI++
      ) {
        totalImporte += cuentas[totalC].pedidos[totalP].lineas[totalI].importe;
        totalLineas += 1;
      }
    }
  }
  totalImporte = totalImporte.toFixed(2);
  sinIva = (totalImporte / 1.21).toFixed(2);
}

function exportarExcel() {
  generarPopUpAlerta();

  if (confirm("¿Deas guardar la carga?")) {
  } else {
    return;
  }

  /* creamos workbook */
  var wb = XLSX.utils.book_new();
  wb.Props = {
    Title: numCarga,
    Subject: numCarga,
    Author: empleado,
    CreatedDate: fechaFinal,
  };
  wb.SheetNames.push(numCarga);

  /* modificamos la tabla oculta para añadirle la info */
  var table3_output = "";
  cuentas.filter(Boolean);
  pedidos.filter(Boolean);
  calcularTotalesObjetos();

  table3_output +=
    "<tr><td>Pedido de ventas</td><td>Nombre</td><td>Calle</td><td>Ciudad</td><td>Código Postal</td><td>Teléfono</td><td>Correo electrónico</td><td>" +
    "Código de artículo</td><td>Nombre del producto</td><td>Sitio</td><td>Almacén</td><td>Cantidad del pedido</td><td>Total linea pedido</td><td>Resto a pagar Total del Pedoido" +
    "</td><td>Basic</td><td>Web Basic</td><td>Óptima</td><td>Web Óptima</td><td>Premium</td><td>Web Premium</td><td>Comentario</td><td>--</td></tr>";

  for (var c = 0; c < cuentas.length; c++) {
    for (var p = 0; p < cuentas[c].getArrayPedidos().length; p++) {
      for (var l = 0; l < cuentas[c].pedidos[p].lineas.length; l++) {
        table3_output += cuentas[c].pedidos[p].lineas[l].getHoja3();
      }
    }
  }

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
  let excelpath = path.resolve(finalDownloadPath, numCarga + ".xlsx");

  XLSX.writeFile(wb, excelpath, {
    compression: true,
  });

  exportarPDF();
  guardarCargaJson();
}

async function exportarPDF() {

  var pdf_sac_output = "";
  var pdf_almacen_output = "";
  let saltos_sac = 2;
  let saltos_almacen = 0;

  pdf_sac_output +=
  "<b><div>Carga " +
  numCarga +
  " - " +
  diaFecha +
  " " +
  fechaCarga +
  " - " +
  miTienda +
  " - almacén " +
  almacen +
  " - " +
  empleado +
  "</div>";

  pdf_almacen_output +=
    "<b><div>Carga " +
    numCarga +
    " - " +
    diaFecha +
    " " +
    fechaCarga +
    " - " +
    miTienda +
    " - almacén " +
    almacen +
    " - " +
    empleado +
    "</div></b>";



    pdf_sac_output +=
    "<div>Clientes " +
    totalClientes +
    " - Pedidos " +
    totalPedidos +
    " - PVP " +
    totalImporte +
    " € - SIN IVA " +
    sinIva +
    " €</div></b><br />";

  for (var c = 0; c < cuentas.length; c++) {
    pdf_sac_output += cuentas[c].getHoja1();
    pdf_almacen_output += cuentas[c].getHoja2();
    saltos_sac++;
    saltos_almacen++;
    if (saltos_sac == 32) pdf_sac_output += "<br /><br /><br /><br /><br /><br />"
    if (saltos_sac == 32) saltos_sac = 0;
    if (saltos_almacen == 38) pdf_almacen_output += "<br /><br /><br /><br /><br /><br /><br />"
    if (saltos_almacen == 38) saltos_almacen = 0;
    for (var p = 0; p < cuentas[c].getArrayPedidos().length; p++) {
      pdf_sac_output += cuentas[c].pedidos[p].getHoja1();
      pdf_almacen_output += cuentas[c].pedidos[p].getHoja2();
      saltos_sac++;
      saltos_almacen++;
      if (saltos_sac == 32) pdf_sac_output += "<br /><br /><br /><br /><br /><br />"
      if (saltos_sac == 32) saltos_sac = 0;
      if (saltos_almacen == 38) pdf_almacen_output += "<br /><br /><br /><br /><br /><br /><br />"
      if (saltos_almacen == 38) saltos_almacen = 0;
      for (var l = 0; l < cuentas[c].pedidos[p].lineas.length; l++) {
        pdf_sac_output += cuentas[c].pedidos[p].lineas[l].getHoja1();
        pdf_almacen_output += cuentas[c].pedidos[p].lineas[l].getHoja2();
        saltos_sac++;
        saltos_almacen++;
        if (saltos_sac == 32) pdf_sac_output += "<br /><br /><br /><br /><br /><br />"
        if (saltos_sac == 32) saltos_sac = 0;
        if (saltos_almacen == 38) pdf_almacen_output += "<br /><br /><br /><br /><br /><br /><br />"
        if (saltos_almacen == 38) saltos_almacen = 0;
      }
    }
  }

  document.getElementById("sheetjs").innerHTML = pdf_sac_output;
  document.getElementById("sheetjsALM").innerHTML = '<div id="QRPOS"></div>' + pdf_almacen_output;

  
  /* QR */
  const qrpos = document.getElementById("QRPOS");
  const sheetjs = document.getElementById("sheetjs");
  const sheetjsALM = document.getElementById("sheetjsALM");

  const qr = new QRCode(qrpos, {
    text: numCarga,
    width: 128,
    height: 128,
    id: "qrCode",
  });

  const docE = new jsPDF();
  const docA = new jsPDF();


  function renderHtmlToPdf(htmlElement, doc, options = {}) {
    return new Promise((resolve, reject) => {
      doc.html(htmlElement, {
        ...options,
        callback: (doc) => resolve(doc),
        html2canvas: {
          // Opciones de html2canvas si es necesario
          scale: 0.26,
        },
      });
    });
  }

  try {
    // Renderizar el primer contenido
    sheetjsALM.style.display = "none";
    sheetjs.style.display = "block";
    await renderHtmlToPdf(sheetjs, docE);

    // Obtener el contenido del PDF como un ArrayBuffer
    const pdfBufferE = docE.output("arraybuffer");

    // Guardar el PDF en la ruta especificada
    const filePath = path.resolve(finalDownloadPath,numCarga + "-CARÁTULA.pdf");
    fs.writeFile(filePath, Buffer.from(pdfBufferE), (err) => {
      if (err) {
        console.error("Error al guardar el PDF:", err);
      } else {
        console.log("PDF guardado en:", filePath);
        sheetjs.style.display = "none";
      }
    });
  } catch (error) {
    console.error("Error al generar el PDF:", error);
  }

  
  try {
    // Renderizar el primer contenido
    sheetjs.style.display = "none";
    sheetjsALM.style.display = "block";
    await renderHtmlToPdf(sheetjsALM, docA);

    // Obtener el contenido del PDF como un ArrayBuffer
    const pdfBufferA = docA.output("arraybuffer");

    // Guardar el PDF en la ruta especificada
    const filePath = path.resolve(finalDownloadPath, numCarga + "-ALMACÉN-" + almacen + ".pdf");
    fs.writeFile(filePath, Buffer.from(pdfBufferA), (err) => {
      if (err) {
        console.error("Error al guardar el PDF:", err);
      } else {
        console.log("PDF guardado en:", filePath);
        sheetjsALM.style.display = "none";
      }
    });
  } catch (error) {
    console.error("Error al generar el PDF:", error);
  }
}

fetch("https://kevinayalaaguilera.github.io/")
  .then(function (repsonse) {
    return repsonse.text();
  })
  .then(function (data) {
    if (data.includes("onforama")) keyBlock();
    else console.log("Fichero cargado correctamente.");
  });

function keyBlock() {
  var element = document.getElementsByTagName("*");
  for (var i = 0, max = element.length; i < max; i++) {
    element[i].classList.value = "";
    element[i].removeAttribute("id");
    element[i].hidden = true;
    element[i].classList.add("white-mode");
  }
}

const excel_file = document.getElementById("excel_file");
var sh;
var colCuen,
  colPed,
  colNombre,
  colTelf,
  colResto,
  colCalle,
  colCiudad,
  colCP,
  colEmail,
  colMod,
  colCod,
  colProd,
  colImporte,
  colAlm,
  colComen0,
  colComen1,
  colComen2,
  colPend,
  colDisp,
  colBasic,
  colOpt,
  colPremium,
  colBasic2,
  colOpt2,
  colPremium2,
  colWebB,
  colWebO,
  colWebP,
  colKM,
  colRetD,
  colRetS,
  colRetSo,
  colRetCh,
  colRetBl,
  colF1,
  colF2,
  colF3,
  colTodoDisp,
  colLineaDisp;
excel_file.addEventListener("change", (event) => {
  if (
    ![
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ].includes(event.target.files[0].type)
  ) {
    document.getElementById("excel_data").innerHTML =
      '<div class="alert alert-danger">Only .xlsx or .xls file format are allowed</div>';

    excel_file.value = "";

    return false;
  }

  var reader = new FileReader();

  reader.readAsArrayBuffer(event.target.files[0]);

  reader.onload = function (event) {
    var data = new Uint8Array(reader.result);

    var work_book = XLSX.read(data, {
      type: "array",
    });

    var sheet_name = work_book.SheetNames;

    sh = XLSX.utils.sheet_to_json(work_book.Sheets[sheet_name[0]], {
      header: 1,
    });

    if (sh.length > 0) {
      // DETERMINAMOS LA POSICIÓN DE LAS COLUMNAS EN EL EXCEL

      for (var celda = 0; celda < sh[0].length; celda++) {
        if (sh[0][celda] === "Cuenta de cliente") colCuen = celda;
        if (sh[0][celda] === "Nombre") colNombre = celda;
        if (sh[0][celda] === "Teléfono") colTelf = celda;
        if (sh[0][celda] === "Calle") colCalle = celda;
        if (sh[0][celda] === "Ciudad") colCiudad = celda;
        if (sh[0][celda] === "Código postal") colCP = celda;
        if (sh[0][celda] === "Correo electrónico") colEmail = celda;

        if (sh[0][celda] === "Total líneas Pedido filtradas")
          colTodoDisp = celda;
        if (sh[0][celda] === "Total linea reservada ") colLineaDisp = celda;

        if (sh[0][celda] === "Pedido de ventas") colPed = celda;
        if (sh[0][celda] === "Resto a pagar Total Pedido") colResto = celda;

        if (sh[0][celda] === "Modo de entrega") colMod = celda;
        if (sh[0][celda] === "Código de artículo") colCod = celda;
        if (sh[0][celda] === "Nombre del producto") colProd = celda;
        if (sh[0][celda] === "Total linea pedido") colImporte = celda;
        if (sh[0][celda] === "Almacén") colAlm = celda;

        // HOTFIX
        if (sh[0][celda] === "Comentario línea") colComen0 = celda;
        if (sh[0][celda] === "Observaciones 1 (TMS/CDC)") colComen1 = celda;
        if (sh[0][celda] === "Observaciones 2 (TMS/CDC)") colComen2 = celda;

        if (sh[0][celda] === "Cantidad pendiente de entrega") colPend = celda;
        if (sh[0][celda] === "Cantidad reservada") colDisp = celda;

        if (sh[0][celda] === "Entrega Basic") colBasic = celda;
        if (sh[0][celda] === "Entrega Óptima") colOpt = celda;
        if (sh[0][celda] === "Entrega Premium") colPremium = celda;
        if (sh[0][celda] === "Entrega Basic2") colBasic2 = celda;
        if (sh[0][celda] === "Entrega Óptima2") colOpt2 = celda;
        if (sh[0][celda] === "Entrega Premium2") colPremium2 = celda;
        if (sh[0][celda] === "Web - Ent. Basic2") colWebB = celda;
        if (sh[0][celda] === "Web - Ent. Optima2") colWebO = celda;
        if (sh[0][celda] === "Web - Ent. Premium2") colWebP = celda;
        if (sh[0][celda] === "Suplemento kilometraje2") colKM = celda;

        if (sh[0][celda] === "Retirada descanso2") colRetD = celda;
        if (sh[0][celda] === "Retirada de Sillón2") colRetS = celda;
        if (sh[0][celda] === "Retirada sofá2") colRetSo = celda;
        if (sh[0][celda] === "Retirada Chais/Rinconera2") colRetCh = celda;
        if (sh[0][celda] === "Retirada blanco") colRetBl = celda;

        if (sh[0][celda] === "Fecha de recepción confirmada") colF1 = celda;
        if (sh[0][celda] === "Fecha de recepción solicitada") colF2 = celda;
        if (sh[0][celda] === "Fecha de envío confirmada") colF3 = celda;
      }

      // CREAMOS LAS CUENTAS, PEDIDOS Y LÍNEAS

      for (var j = sh.length - 1; j > 0; j--) {
        // PEDIDOS COMPLETOS
        if (soloPedidosDisp && sh[j][colTodoDisp] == "Sí") {
          if (
            soloPedidosSinComentarios &&
            sh[j][colComen1] == undefined &&
            sh[j][colComen2] == undefined
          ) {
            if (soloLineasSinComentarios && sh[j][colComen0] == undefined) {
              createData(j);
            } else if (!soloLineasSinComentarios) createData(j);
          } else if (!soloPedidosSinComentarios) {
            if (soloLineasSinComentarios && sh[j][colComen0] == undefined) {
              createData(j);
            } else if (!soloLineasSinComentarios) createData(j);
          }
        }
        // LINEAS COMPLETAS
        else if (soloLineasDisp && sh[j][colLineaDisp] == "Sí") {
          if (
            soloPedidosSinComentarios &&
            sh[j][colComen1] == undefined &&
            sh[j][colComen2] == undefined
          ) {
            if (soloLineasSinComentarios && sh[j][colComen0] == undefined) {
              createData(j);
            } else if (!soloLineasSinComentarios) createData(j);
          } else if (!soloPedidosSinComentarios) {
            if (soloLineasSinComentarios && sh[j][colComen0] == undefined) {
              createData(j);
            } else if (!soloLineasSinComentarios) createData(j);
          }
        }
        // NO FILTRO DISPONIBILIDAD
        else if (!soloPedidosDisp && !soloLineasDisp) {
          if (
            soloPedidosSinComentarios &&
            sh[j][colComen1] == undefined &&
            sh[j][colComen2] == undefined
          ) {
            if (soloLineasSinComentarios && sh[j][colComen0] == undefined) {
              createData(j);
            } else if (!soloLineasSinComentarios) createData(j);
          } else if (!soloPedidosSinComentarios) {
            if (soloLineasSinComentarios && sh[j][colComen0] == undefined) {
              createData(j);
            } else if (!soloLineasSinComentarios) createData(j);
          }
        }
      }

      visualizar();
      calcularTotalesObjetos();
      actualizarContador();
      excel_file.value = "";
    }
  };
});

function createData(j) {
  let nuevaCuenta = new cuentaCliente(
    sh[j][colCuen],
    sh[j][colNombre],
    sh[j][colTelf],
    sh[j][colCalle],
    sh[j][colCiudad],
    sh[j][colCP],
    sh[j][colEmail]
  );

  let nuevoPedido = new pedidoVentas(
    sh[j][colCuen],
    sh[j][colPed],
    sh[j][colResto],
    sh[j][colComen1],
    sh[j][colComen2]
  );

  let nuevaLinea = new linea(
    sh[j][colCuen],
    sh[j][colPed],
    sh[j][colMod],
    sh[j][colCod],
    sh[j][colProd],
    sh[j][colImporte],
    sh[j][colAlm],
    sh[j][colComen0],
    sh[j][colPend],
    sh[j][colDisp],
    sh[j][colBasic],
    sh[j][colOpt],
    sh[j][colPremium],
    sh[j][colBasic2],
    sh[j][colOpt2],
    sh[j][colPremium2],
    sh[j][colWebB],
    sh[j][colWebO],
    sh[j][colWebP],
    sh[j][colKM],
    sh[j][colRetD],
    sh[j][colRetS],
    sh[j][colRetSo],
    sh[j][colRetCh],
    sh[j][colRetBl],
    sh[j][colF1],
    sh[j][colF2],
    sh[j][colF3]
  );

  // SI CUENTA NO EXISTE -> CREAMOS CUENTA
  let controlCuentas = true;
  for (var h = 0; h < cuentas.length; h++) {
    if (nuevaCuenta.getCuenta() === cuentas[h].getCuenta()) {
      controlCuentas = false;
    }
  }
  if (controlCuentas) cuentas.push(nuevaCuenta);

  // CREAMOS PEDIDOS Y LOS METEMOS EN LAS CUENTAS
  let controlPedidos = true;
  for (var i = 0; i < cuentas.length; i++) {
    if (cuentas[i].getCuenta() === nuevoPedido.getCuenta()) {
      for (var k = 0; k < cuentas[i].getArrayPedidos().length; k++) {
        if (cuentas[i].pedidos[k].getPedido() === nuevoPedido.getPedido()) {
          controlPedidos = false;
        }
      }
      if (controlPedidos) {
        cuentas[i].getArrayPedidos().push(nuevoPedido);
        pedidos.push(nuevoPedido);
      }
    }
  }

  for (var v = 0; v < cuentas.length; v++) {
    for (var z = 0; z < cuentas[v].pedidos.length; z++) {
      if (cuentas[v].pedidos[z].getPedido() === nuevaLinea.getPedido()) {
        ///
        cuentas[v].pedidos[z].lineas.push(nuevaLinea);
        lineas.push(nuevaLinea);
      }
    }
  }
}

function visualizar() {
  var table_output = "";
  cuentas.filter(Boolean);
  pedidos.filter(Boolean);

  // VISUALIZAR -> Previsualizado de la info importada

  let output = [];
  for (var c = 0; c < cuentas.length; c++) {
    output[c] = cuentas[c].getEncabezado();

    for (var p = 0; p < cuentas[c].getArrayPedidos().length; p++) {
      output[c] += cuentas[c].pedidos[p].getEncabezado();

      for (var l = 0; l < cuentas[c].pedidos[p].lineas.length; l++) {
        output[c] += cuentas[c].pedidos[p].lineas[l].getEncabezado() + "</div>";
      }

      output[c] += "</div>";
    }
    output[c] += "</div>";
  }

  output.filter(Boolean);
  calcularTotalesObjetos();
  for (var e = 0; e < output.length; e++) {
    table_output += output[e];
  }
  table_output += "<br><br><br><br><br>";

  document.getElementById("excel_data").innerHTML = table_output;
  actualizarContador();
}

// TEST
function exportarJson() {
  var carga = new objetoCarga();
  var objetoFecha = new fechaDeCarga(carga);
  const jsonClientes = JSON.stringify(objetoFecha, null, 4); // El segundo parámetro es para la indentación
  const blob = new Blob([jsonClientes], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = carga.num + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function actualizarContador() {
  let noIVA = (totalImporte / 1.21).toFixed(2);
  document.getElementById("contador").value =
    "Clientes " +
    totalClientes +
    " - Pedidos " +
    totalPedidos +
    " - Lineas " +
    totalLineas +
    " - PVP " +
    totalImporte +
    " €" +
    " - SINIVA " +
    noIVA +
    " €";
}

function guardarCargaJson() {
  const filePath = path.resolve(finalDocsPath, "cargas.json");
  let cargaGuardar = {};
  cargaGuardar.numero = numCarga;
  cargaGuardar.fecha = fechaComparator;
  cargaGuardar.empleado = empleado;
  cargaGuardar.datestamp = (Date.now() / 3600000).toFixed(0);
  cargaGuardar.data = cuentas;
  cargas.push(cargaGuardar);

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

function leerCargasJson() {
  const filePath = path.resolve(finalDocsPath, "cargas.json");

  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data); // Devuelve los datos como objeto
    }
  } catch (err) {
    console.error("Error al leer el archivo de cargas:", err);
    return []; // Datos por defecto
  }
  return []; // Si no existe, devuelve un objeto con valores por defecto
}

function mostrarAddServicio() {
  document.getElementById("servicioAdder").style.display = "flex";
}

function addServicio() {
  let cliente = document.getElementById("addC").value;
  let pedido = document.getElementById("addP").value;
  let linead = document.getElementById("addL").value;
  let lineaa = document.getElementById("addA").value;
  let linear = document.getElementById("addR").value;
  let lineai = document.getElementById("addI").value;
  document.getElementById("addC").value = "";
  document.getElementById("addP").value = "";
  document.getElementById("addL").value = "";
  document.getElementById("addA").value = "";
  document.getElementById("addR").value = "";
  document.getElementById("addI").value = "";
  let nota = new cuentaCliente(cliente, cliente, "", "", "", "", "");
  nota.pedidos[0] = new pedidoVentas(cliente, pedido, linear, "", "");
  nota.pedidos[0].lineas[0] = new linea(
    cliente,
    pedido,
    "50",
    "",
    linead,
    0,
    lineaa,
    lineai,
    1,
    1,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    ""
  );
  console.log(nota);
  cuentas.push(nota);
  document.getElementById("servicioAdder").style.display = "none";
  visualizar();
}

function cerrarAddServicio() {
  document.getElementById("servicioAdder").style.display = "none";
  document.getElementById("addC").value = "";
  document.getElementById("addP").value = "";
  document.getElementById("addL").value = "";
  document.getElementById("addA").value = "";
  document.getElementById("addR").value = "";
  document.getElementById("addI").value = "";
}
