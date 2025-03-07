
// Función para guardar datos en un archivo JSON
function guardarJson(data) {
    fs.writeFile(finalConfigPath, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error("Error al guardar:", err);
        } else {
            console.log("Configuración guardada en:", finalConfigPath);
        }
    });
}

// Función para leer datos desde un archivo JSON
function leerJson() {
    try {
        if (fs.existsSync(finalConfigPath)) {
            const data = fs.readFileSync(finalConfigPath, 'utf8');
            return JSON.parse(data); // Devuelve los datos como objeto
        }
    } catch (err) {
        console.error("Error al leer el archivo de configuración:", err);
        return { almacenes: [], checkboxes: {} }; // Datos por defecto
    }
    return { almacenes: [], checkboxes: {} }; // Si no existe, devuelve un objeto con valores por defecto
}

// Función para cambiar entre los distintos menús
function showOpt(numb) {
    let opts = Array.from(document.getElementById('menu').children);
    opts[numb].style="filter: grayscale(0%);";
    let optsDisplay = Array.from(document.getElementById('body').children);
    optsDisplay[numb].style = "margin-top: 100px; display: block;";
    let index = 0;
    opts.forEach(element => {
        if (index != numb && index != 0) {
            element.style="filter: grayscale(100%);";
            optsDisplay[index].style = "display: none;";
        }
        index++;
    });
    
}

document.addEventListener('DOMContentLoaded', function() {
    // Leer la configuración desde el archivo JSON
    let config = leerJson();

    // Mostrar la configuración en la interfaz
    mostrarConfig(config);

    // Inicializar la configuración, si no existe "almacenes", lo inicializamos como un array vacío
    let nueva_config = config || {};  // Si no hay configuración, inicializamos un objeto vacío
    if (!nueva_config["almacenes"]) {
        nueva_config["almacenes"] = [];  // Aseguramos que "almacenes" esté siempre inicializado
    }

    // Mostrar los almacenes cargados en el selector
    cargarAlmacenes(nueva_config["almacenes"]);

    // Añadir un nuevo almacén
    const addAlmacenBTN = document.getElementById("addAlmacenBTN");
    addAlmacenBTN.onclick = function () {
        let almacen_adder = document.getElementById("almacen").value;
        let para = document.getElementById("para").value;
        let cc = document.getElementById("cc").value;
        let tienda = document.getElementById("tienda").value;

        if (almacen_adder) {
            let index = nueva_config["almacenes"].findIndex(almacen => almacen.almacen === almacen_adder);

            let nuevoAlmacen = {
                almacen: almacen_adder,
                para: para,
                cc: cc,
                tienda: tienda
            };

            if (index !== -1) {
                // Si el almacén ya existe, actualizar sus valores
                nueva_config["almacenes"][index] = nuevoAlmacen;
            } else {
                // Si no existe, agregarlo como nuevo
                nueva_config["almacenes"].push(nuevoAlmacen);
            }

            guardarJson(nueva_config); // Guardar la configuración actualizada
            cargarAlmacenes(nueva_config["almacenes"]); // Recargar los almacenes en el selector
        }
    }

    // Guardar config MailHelper
    const guardarMailHelper = document.getElementById("modifMailHelper");
    guardarMailHelper.onclick = function () {
        let diferido = document.getElementById("diferido").value;
        let transporte = document.getElementById("transporte").value;
        let ruta = document.getElementById("ruta").value;
        let sav = document.getElementById("sav").value;
        let resto = document.getElementById("resto").value;

        nueva_config.mailhelper.diferido = diferido;
        nueva_config.mailhelper.transporte = transporte;
        nueva_config.mailhelper.ruta = ruta;
        nueva_config.mailhelper.sav = sav;
        nueva_config.mailhelper.resto = resto;

        guardarJson(nueva_config); // Guardar la configuración actualizada
        cargarAlmacenes(nueva_config["almacenes"]); // Recargar los almacenes en el selector
    }

    // Función para leer el estado de los checkboxes
    function leerCheckboxes() {
        let checkboxes = {};
        document.querySelectorAll('input[type="checkbox"]').forEach(function(checkbox) {
            checkboxes[checkbox.id] = checkbox.checked;
        });

        // Guardar el estado de los checkboxes en la configuración
        nueva_config["checkboxes"] = checkboxes;
        guardarJson(nueva_config); // Guardar la configuración actualizada
    }

    // Añadir eventos para leer los checkboxes cuando cambien
    document.addEventListener('click', leerCheckboxes);
    document.addEventListener('keyup', leerCheckboxes);
    document.addEventListener('change', leerCheckboxes);

    // Función para mostrar la configuración de los checkboxes y los almacenes
    function mostrarConfig(config) {
        // Aplicar el estado de los checkboxes
        if (config["checkboxes"]) {
            for (let id in config["checkboxes"]) {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.checked = config["checkboxes"][id];
                }
            }
        }

        if(config) {
            if (config.mailhelper == undefined) config.mailhelper = {};
            if (config.mailhelper.diferido == undefined) config.mailhelper.diferido = "";
            if (config.mailhelper.transporte == undefined) config.mailhelper.transporte = "";
            if (config.mailhelper.ruta == undefined) config.mailhelper.ruta = "";
            if (config.mailhelper.sav == undefined) config.mailhelper.sav = "";
            if (config.mailhelper.resto == undefined) config.mailhelper.resto = "";

            document.getElementById("diferido").value = config.mailhelper.diferido;
            document.getElementById("transporte").value = config.mailhelper.transporte;
            document.getElementById("ruta").value = config.mailhelper.ruta;
            document.getElementById("sav").value = config.mailhelper.sav;
            document.getElementById("resto").value = config.mailhelper.resto;
        }
    }

    // Función para cargar los almacenes en el selector (evitar duplicados)
    function cargarAlmacenes(almacenes) {
        const sel = document.getElementById("almacen_selector");

        // Limpiar opciones anteriores
        sel.innerHTML = ''; // Elimina todas las opciones previas
        let optempty = document.createElement("option");
        optempty.value = "Selecciona...";
        optempty.text = "Selecciona...";
        sel.add(optempty);

        // Agregar las nuevas opciones
        almacenes.forEach(element => {
            let opt = document.createElement("option");
            opt.value = element.almacen; // Usamos el nombre del almacén como valor
            opt.text = element.almacen; // Usamos el nombre del almacén como texto
            sel.add(opt);
        });
    }

    // Cuando se selecciona un almacén del selector, mostrar su información en los inputs
    document.getElementById("almacen_selector").addEventListener("change", function() {
        const selectedAlmacen = this.value;
        const almacen = nueva_config["almacenes"].find(almacen => almacen.almacen === selectedAlmacen);

        if (almacen) {
            document.getElementById("almacen").value = almacen.almacen;
            document.getElementById("para").value = almacen.para;
            document.getElementById("cc").value = almacen.cc;
            document.getElementById("tienda").value = almacen.tienda;
        }
    });
});