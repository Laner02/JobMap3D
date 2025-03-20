
//#region Variables
// To be able to actually display smth with three.js, we need 3 things: camera, scene and renderer
/* SCENE */
const scene = new THREE.Scene();                    // Create a scene
const floader = new THREE.FontLoader();

scene.background = new THREE.Color(0xdbdbd9);     // Sets the scene background

/* CAMERA */
// Sets (FOV, aspect_ratio, near_clipping, far_clipping)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);

/* LIGHTS */
scene.add(new THREE.HemisphereLight(0xffffcc, 0x19bbdc, 1));      // Set a global light for the scene

/* RENDERER */
// Set the renderer to render on the canvas already made on html, so i can control the size by CSS
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("canvasThree") });
renderer.setSize(window.innerWidth, window.innerHeight, false);          // Sets the size of the renderer

/* GRUPOS DE MODELOS THREEJS */
let modeloCyL = new THREE.Group();            // Modelado del mapa de Castilla y León
let modeloCrecimientoCyL = new THREE.Group(); // Modelado del mapa de crecimiento laboral
let grupoOfertas = new THREE.Group();         // Grupo para los elementos de ofertas
let grupoParo = new THREE.Group();            // Grupo para los elementos de paro
grupoParo.visible = false;
let grupoContratos = new THREE.Group();       // Grupo para los elementos de contratos
grupoContratos.visible = false;

/* RAYCAST */
let raycaster, intersects;
let drawRay;
let vectorRaycast, vIntersects;             // Raycast for the vector tool
let vectorStartingPos;                      // Position of the first point of the vector
let vectorDirection = new THREE.Vector3();  // vectorRaycast direction
let vectorFar = new THREE.Vector3();        // vectorRaycast max reach
const RAYCASTER_OG_SIZE = 0.1;              // Default raycaster size
let vRaycasterSize = 0.5;                   // Vector raycast size, to make the line bigger or smaller in size
let bRaycasterSize = 0.5;                   // Mouse raycast size, to make it select various points at once with the brush tool, select everyone inside intersects

/* MOUSE POINTER */
let pointer, INTERSECTED;

/* Show/Hide Points & Focus */
let isTagShown;                 // Array with flags for each tag to check if they are shown or hidden
let isTagFocused;               // Array with flags for each label to check if its focused
let is_bbx_hidden;              // Flag to determine when the bounding boxes are hidden or shown

/* Load Icon Var */
let is_loading;                                 // Lock flag to assert the user doesnt missbehave while loading time happens
let loadIcon;                                   // Var storing the loading icon HTML element
let loadBack;                                   // Var storing the loading background pannel HTML element
let loadRotation = 0;                           // Value of the actual rotation of the loading icon
//#endregion

//#region event listeners
/* RESIZING EVT LISTENER */
window.addEventListener('resize', () => {

  // Updates both the size of the camera space, and the renderer size
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Resize the trackballcontrols
  // controls.handleResize();

  renderer.setSize(window.innerWidth, window.innerHeight, false);

});

// Append the renderer to the html document
document.getElementById("viewerContainer").appendChild(renderer.domElement);
//#endregion

/* ORBIT CONTROLS */
const controls = new THREE.TrackballControls(camera, renderer.domElement);
controls.panSpeed = 0.5;            // 1 por defecto
controls.rotateSpeed = 0.3;           // 1 por defecto
controls.zoomSpeed = 0.3;           // 1 por defecto
controls.screenSpacePanning = false;

//#region Modelado CyL
// Crea el modelado de castilla y leon y lo añade a escena
fetch('/jobmapweb/static/castilla_y_leon.geojson')
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al cargar el archivo GeoJSON');
    }

    return response.json();
  })
  .then(data => {
    ;
    data.features.forEach((feature) => {
      const { geometry } = feature;

      if (geometry.type === "Polygon") {
        // Para procesar un polígono
        addPolygonToScene(geometry.coordinates, modeloCyL);
      } else if (geometry.type === "MultiPolygon") {
        // Para procesar un multipolígono (varios conjuntos de coordenadas)
        geometry.coordinates.forEach((polygon) => {
          addPolygonToScene(polygon, modeloCyL);
        });
      }
    });
  })
  .catch(error => {
    console.error('Error:', error);
  });

function addPolygonToScene(coordinates, group) {

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x000000, // Color negro para los bordes
    linewidth: 1 // Grosor de la línea (puede variar según el navegador)
  });

  const material = new THREE.MeshPhongMaterial({
    color: 0x87ceeb, // Azul suave (Hexadecimal para SkyBlue)
    side: THREE.DoubleSide, // Renderizado en ambos lados
    flatShading: true // Sombreado plano para resaltar bordes
  });

  coordinates.forEach((ring) => {
    const shape = new THREE.Shape();

    ring.forEach(([x, y], index) => {
      if (index === 0) {
        shape.moveTo(x, y); // Primer punto
      } else {
        shape.lineTo(x, y); // Puntos siguientes
      }
    });

    // Configurar extrusión (grosor en el eje Z)
    const extrudeSettings = {
      depth: 0.4, // Grosor en el eje Z
      bevelEnabled: false // Sin biseles
    };

    // Crear geometría extruida
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Crear malla
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(5, -34.5, 30.5)
    // Añadir malla al grupo del modelo 3D
    group.add(mesh);

    // Crear los bordes visibles
    const edges = new THREE.EdgesGeometry(geometry); // Generar geometría de bordes
    const line = new THREE.LineSegments(edges, edgeMaterial); // Aplicar material a los bordes
    line.position.set(5, -34.5, 30.5)
    group.add(line);

    // Añadimos el modelo completo a la escena
    scene.add(group);
  });
}
//#endregion
//#region Modelado Crecimiento CyL
fetch('/jobmapweb/static/castilla_y_leon.geojson')
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al cargar el archivo GeoJSON');
    }

    return response.json();
  })
  .then(data => {
    ;
    data.features.forEach((feature) => {
      const { geometry } = feature;

      // TODO hacer que primero se obtengan los datos de contratos - paro, y si es positivo, verde suave. Si es negativo, rojo suave. Los botones solo cambian el mapa, se pueden seguir viendo las frecuencias
      // TODO añadir el color en la funcion addpolygon, y reescribirla
      if (geometry.type === "Polygon") {
        // Para procesar un polígono
        addPolygonToScene(geometry.coordinates, modeloCrecimientoCyL);
      } else if (geometry.type === "MultiPolygon") {
        // Para procesar un multipolígono (varios conjuntos de coordenadas)
        geometry.coordinates.forEach((polygon) => {
          addPolygonToScene(polygon, modeloCrecimientoCyL);
        });
      }
    });
  })
  .catch(error => {
    console.error('Error:', error);
  });
//#endregion

// Centramos la camara inicial para que se contemple correctamente el mapa
camera.position.set(0, 7.9, 33);

// Inicialmente se muestran las ofertas de empleo, al clickar el mapa, se esconden estas y se muestra otros datos
fetchOfertasEmpleo();

// Sets the raycaster for mouse interactions
raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.1;    // Raycasters for points need an specific threshold for the precision
pointer = new THREE.Vector2();

//#region General Events
window.onkeyup = function (event) {
  // TODO events that happen when the user stops pressing a key
}

window.onkeydown = function (event) {
  // TODO events that happen when the user starts pressing a key
}

window.onmousedown = function (event) {
  // TODO events that happen when the user starts pressing a mouse button
}

window.onmouseup = function (event) {
  // TODO events that happen when the user stops pressing a mouse button
}

// On pointer movement, tracks the mouse pointer 2d position
document.addEventListener('mousemove', (e) => {
  // When the pointer moves, save its coords
  let rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = - ((e.clientY - rect.top) / rect.height) * 2 + 1;       // negative or it will invert the Y axis
});

// Listener for the context menu inside the visualizer canvas, to prevent it from appearing on right-click
document.getElementById("canvasThree").addEventListener('contextmenu', (e) => {
  e.preventDefault()
});

// TODO for testing purposes only
// Test function to see whats inside the scene
function checkScene() {
  console.log(scene);
}

//#region ONLOAD Evt Listeners
/* ONLOAD FUNCTION */
// This function is called when the whole document is loaded
window.onload = function () {

  // Sets loading to true
  is_loading = true;

  // At this point, the map 3d model is already loaded

  /* TOOLBAR SECTION */
  // When the user clicks the logo
  document.getElementById("appLogo").addEventListener('click', (e) => {
    goToIndex()
    e.stopPropagation()
  })

  /* FILTERS SECTION */
  // Elementos de los filtros
  const filtro_oferta = document.getElementById("checkbox-box-0");
  const filtro_oferta_1 = document.getElementById("checkbox-box-01");
  const filtro_oferta_2 = document.getElementById("checkbox-box-02");
  const filtro_oferta_3 = document.getElementById("checkbox-box-03");
  const filtro_oferta_4 = document.getElementById("checkbox-box-04");
  const filtro_oferta_5 = document.getElementById("checkbox-box-05");
  const filtro_paro = document.getElementById("checkbox-box-1");
  const filtro_paro_1 = document.getElementById("checkbox-box-12");
  const filtro_paro_2 = document.getElementById("checkbox-box-13");
  const filtro_paro_3 = document.getElementById("checkbox-box-14");
  const filtro_paro_4 = document.getElementById("checkbox-box-15");
  const filtro_paro_5 = document.getElementById("checkbox-box-16");
  const filtro_contrato = document.getElementById("checkbox-box-2");
  const filtro_contrato_1 = document.getElementById("checkbox-box-22");
  const filtro_contrato_2 = document.getElementById("checkbox-box-23");
  const filtro_contrato_3 = document.getElementById("checkbox-box-24");
  const filtro_contrato_4 = document.getElementById("checkbox-box-25");
  const filtro_contrato_5 = document.getElementById("checkbox-box-26");
  
  // Event listeners para los filtros de ofertas
  filtro_oferta.addEventListener('click', (e) => {
    // Cuando se selecciona el filtro
    if (filtro_oferta.checked) {
      // Se comprueba que fechas estan marcadas
      const lista_fechas = [];
      
      // Control manual, podría automatizarse
      if (filtro_oferta_1.checked) lista_fechas.push('2025-');
      if (filtro_oferta_2.checked) lista_fechas.push('2024-');
      if (filtro_oferta_3.checked) lista_fechas.push('2023-');
      if (filtro_oferta_4.checked) lista_fechas.push('2021-');
      if (filtro_oferta_5.checked) lista_fechas.push('2020-');

      console.log(lista_fechas)

      // Se aplican los filtros al mapa
      fetchOfertasEmpleoByFecha(lista_fechas);
    }
    // Se cancelan otros eventos
    e.stopImmediatePropagation();
  })

  // Event listeners para los filtros de paro
  filtro_paro.addEventListener('click', (e) => {
    // Cuando se selecciona el filtro
    if (filtro_paro.checked) {
      // Se comprueba que fechas estan marcadas
      const lista_fechas = [];
      
      // Control manual, podría automatizarse
      if (filtro_paro_1.checked) lista_fechas.push('2025-');
      if (filtro_paro_2.checked) lista_fechas.push('2024-');
      if (filtro_paro_3.checked) lista_fechas.push('2023-');
      if (filtro_paro_4.checked) lista_fechas.push('2021-');
      if (filtro_paro_5.checked) lista_fechas.push('2020-');
      
      console.log(lista_fechas)

      const filtro_paro_seleccionado = document.querySelector('input[name="paro-type"]:checked');   // Obtiene el filtro de paro sleccionado

      // Se comprueba que subfiltro esta seleccionado y se aplican los filtros al mapa
      switch (filtro_paro_seleccionado.id) {
        case 'checkbox-box-11':
          fetchParoByFilter(lista_fechas, 'total');
          break;
        case 'checkbox-box-111':
          fetchParoByFilter(lista_fechas, 'mujer');
          break;
        case 'checkbox-box-112':
          fetchParoByFilter(lista_fechas, 'varon');
          break;
        case 'checkbox-box-113':
          fetchParoByFilter(lista_fechas, 'menos_25');
          break;
        case 'checkbox-box-114':
          fetchParoByFilter(lista_fechas, 'mas_25');
          break;
        case 'checkbox-box-115':
          fetchParoByFilter(lista_fechas, 'de_25_45');
          break;  
        case 'checkbox-box-116':
          fetchParoByFilter(lista_fechas, 'mas_45');
          break;
        default:
          fetchParoByFilter(lista_fechas, 'total');
          break;
      }
    }
    // Se cancelan otros eventos
    e.stopImmediatePropagation();
  })

  // Event listeners para los filtros de contratos
  filtro_contrato.addEventListener('click', (e) => {
    // Cuando se selecciona el filtro
    if (filtro_contrato.checked) {
      // Se comprueba que fechas estan marcadas
      const lista_fechas = [];
      
      // Control manual, podría automatizarse
      if (filtro_contrato_1.checked) lista_fechas.push('2025-');
      if (filtro_contrato_2.checked) lista_fechas.push('2024-');
      if (filtro_contrato_3.checked) lista_fechas.push('2023-');
      if (filtro_contrato_4.checked) lista_fechas.push('2021-');
      if (filtro_contrato_5.checked) lista_fechas.push('2020-');
      
      console.log(lista_fechas)
  
      const filtro_contrato_seleccionado = document.querySelector('input[name="contrato-type"]:checked');   // Obtiene el filtro de contratos sleccionado
  
      // Se comprueba que subfiltro esta seleccionado y se aplican los filtros al mapa
      switch (filtro_contrato_seleccionado.id) {
        case 'checkbox-box-21':
          fetchContratosByFilter(lista_fechas, 'total');
          break;
        case 'checkbox-box-211':
          fetchContratosByFilter(lista_fechas, 'indefinido');
          break;
        case 'checkbox-box-212':
          fetchContratosByFilter(lista_fechas, 'temporal');
          break;
        default:
          fetchContratos();
          break;
      }
    }
    // Se cancelan otros eventos
    e.stopImmediatePropagation();
  })

  // TODO is this needed?

  // Saves the loading icon, for optimization
  loadIcon = document.getElementById("loadIcon");
  loadBack = document.getElementById("loadBack");
  //loadBack.style.display = "none";

  // Hides the loading screen panel
  document.getElementById("loadingPanel").style.display = "none";

  // Sets loading to finished
  is_loading = false;
}
//#endregion

/* ANIMATE FUNCTION */
// Renders the scene with the camera given every frame. This method holds almost every action on runtime
function animate() {

  // TODO make a contition for animate?? So its optimized?
  requestAnimationFrame(animate);

  resizeCanvas();
  controls.update();

  render();   // TODO add the render function

}

// Renders the scene on runtime
function render() {
  renderer.render(scene, camera);
}

/* ANIMATE EVERY FRAME */
animate();

// Funcion que muestra los grupos deseados
function showGrupo(grupo) {
  grupo.visible = true;
}

// Funcion que oculta los grupos deseados
function hideGrupo(grupo) {
  grupo.visible = false;
}


//#region Fetch de ofertas
/* AUX FUNCTIONS */
// Function that gets the data from the CyL database async by calling the python view
function fetchOfertasEmpleo() {
  fetch('/jobmapweb/static/ofertas-de-empleo.geojson')
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al cargar el archivo GeoJSON de ofertas de empleo');
      }

      return response.json();
    })
    .then(data => {
      // Si existia el grupo, se elimina
      scene.remove(grupoOfertas);
      grupoOfertas = new THREE.Group();

      // Oculta grupos
      hideGrupo(grupoParo);
      hideGrupo(grupoContratos);

      // Procesamiento del geojson
      const localidades = {};

      data.features.forEach((feature) => {
        // Si el punto son los creditos finales, los salta
        if (!feature.geometry)
          return;

        const localidad = feature.properties.localidad;
        const [lon, lat] = feature.geometry.coordinates;

        // Si la localidad no estaba en la lista, se añade
        if (!localidades[localidad])
          localidades[localidad] = { count: 0, sumX: 0, sumY: 0 };

        // Se añaden los datos de la localidad actual al vector
        localidades[localidad].count++;
        localidades[localidad].sumX += lon;
        localidades[localidad].sumY += lat;
      });

      // Calculo de las coordenadas medias de cada localidad
      const coordsmedias = Object.keys(localidades).map(localidad => {
        const { count, sumX, sumY } = localidades[localidad];

        return {
          localidad,
          coords: [sumX / count, sumY / count],
          frecuencia: count
        }
      });

      // Representa cada localidad y su frecuencia en el mapa
      coordsmedias.forEach(coord => {
        // FIltramos por frecuencia
        if (coord.frecuencia > 10) {
          // Punto para mostrar la localidad con la altura del cubo siendo los datos a representar
          const geometria = new THREE.BoxGeometry(0.05, coord.frecuencia / 50, 0.05);
          const material = new THREE.MeshBasicMaterial({ color: 0x87CEEB });
          const cuboMesh = new THREE.Mesh(geometria, material);

          // Situa la barra y la añade al grupo
          cuboMesh.position.set(coord.coords[0] + 5, coord.coords[1] - 34.5 + (coord.frecuencia / 100), 31);
          grupoOfertas.add(cuboMesh);
          
          // Etiqueta de la localidad y su frecuencia
          floader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
            const textSprite = createTextSprite(`${coord.localidad}:${coord.frecuencia}`);
            
            textSprite.position.set(coord.coords[0] + 5.7, coord.coords[1] - 35, 31);
            textSprite.material.depthTest = false;
            textSprite.material.depthWrite = false;
            grupoOfertas.add(textSprite);
          });
          
          // Añade el grupo a la escena
          scene.add(grupoOfertas);
        }
      });
    })
    .catch(error => {
      console.log("[JobMap3D] Ha ocurrido un error obteniendo las ofertas de empleo.")
      console.log(error);
    });
}

// Funcion que crea un elemento sprite 2D de un texto recibido
function createTextSprite(message, parameters) {
  const fontface = "Arial";
  const fontsize = 16;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  context.font = `${fontsize}px ${fontface}`;
  context.fillStyle = "black";
  context.fillText(message, 0, fontsize);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(2, 1, 1);
  return sprite;
}
//#endregion

//#region Orden por fecha
// Obtiene las ofertas de empleo en la fecha especificada
function fetchOfertasEmpleoByFecha(lista_fechas) {
  fetch('/jobmapweb/static/ofertas-de-empleo.geojson')
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al cargar el archivo GeoJSON de ofertas de empleo');
      }

      return response.json();
    })
    .then(data => {
      // Si existia el grupo, se elimina
      scene.remove(grupoOfertas);
      grupoOfertas = new THREE.Group();

      // Oculta grupos
      hideGrupo(grupoParo);
      hideGrupo(grupoContratos);

      // Procesamiento del geojson
      const localidades = {};

      data.features.forEach((feature) => {
        // Si el punto son los creditos finales, los salta
        if (!feature.geometry)
          return;

        // Filtro por fecha
        if (lista_fechas.some(fecha => feature.properties.fecha_publicacion.startsWith(fecha)))
        {

          const localidad = feature.properties.localidad;
          const [lon, lat] = feature.geometry.coordinates;

          // Si la localidad no estaba en la lista, se añade
          if (!localidades[localidad])
            localidades[localidad] = { count: 0, sumX: 0, sumY: 0 };

          // Se añaden los datos de la localidad actual al vector
          localidades[localidad].count++;
          localidades[localidad].sumX += lon;
          localidades[localidad].sumY += lat;
        
        }
      });

      // Calculo de las coordenadas medias de cada localidad
      const coordsmedias = Object.keys(localidades).map(localidad => {
        const { count, sumX, sumY } = localidades[localidad];

        return {
          localidad,
          coords: [sumX / count, sumY / count],
          frecuencia: count
        }
      });

      // Representa cada localidad y su frecuencia en el mapa
      coordsmedias.forEach(coord => {
        // FIltramos por frecuencia solo si contiene 2025, para no saturar al usuario
        if (!lista_fechas.includes('2025-') || coord.frecuencia > 10) {
          // Punto para mostrar la localidad con la altura del cubo siendo los datos a representar
          const geometria = new THREE.BoxGeometry(0.05, coord.frecuencia / 50, 0.05);
          const material = new THREE.MeshBasicMaterial({ color: 0x87CEEB });
          const cuboMesh = new THREE.Mesh(geometria, material);

          // Situa la barra y la añade al grupo
          cuboMesh.position.set(coord.coords[0] + 5, coord.coords[1] - 34.5 + (coord.frecuencia / 100), 31);
          grupoOfertas.add(cuboMesh);
          
          // Etiqueta de la localidad y su frecuencia
          floader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
            const textSprite = createTextSprite(`${coord.localidad}:${coord.frecuencia}`);
            
            textSprite.position.set(coord.coords[0] + 5.7, coord.coords[1] - 35, 31);
            textSprite.material.depthTest = false;
            textSprite.material.depthWrite = false;
            grupoOfertas.add(textSprite);
          });
          
          // Añade el grupo a la escena
          scene.add(grupoOfertas);
        }
      });
    })
    .catch(error => {
      console.log("[JobMap3D] Ha ocurrido un error obteniendo las ofertas de empleo.")
      console.log(error);
    });
}
//#endregion 

//#region Fetch de paro
// Función que obtiene los datos de paro de la BD de CyL
function fetchParo() {
  fetch('/jobmapweb/static/paro-provincias.geojson')
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al cargar el archivo GeoJSON de estadísticas de paro');
      }

      return response.json();
    })
    .then(data => {
      scene.remove(grupoParo);
      grupoParo = new THREE.Group();

      hideGrupo(grupoOfertas);
      hideGrupo(grupoContratos);

      // Procesamiento del geojson
      const provincias = {};

      data.features.forEach((feature) => {
        // Si el punto son los creditos finales, los salta
        if (!feature.geometry)
          return;

        const provincia = feature.properties.nombre_territorio;
        const [lon, lat] = feature.geometry.coordinates;

        // Si la provincia no estaba en la lista, se añade
        if (!provincias[provincia])
          provincias[provincia] = { cnt: 0, total: 0, mujeres: 0, varones: 0, sumX: 0, sumY: 0 };

        // Se añaden los datos de la provincia actual al vector
        provincias[provincia].cnt++;
        provincias[provincia].sumX += lon;
        provincias[provincia].sumY += lat;
        provincias[provincia].total += feature.properties.total;
        provincias[provincia].mujeres += feature.properties.mujer;
        provincias[provincia].varones += feature.properties.varon;
      });

      // Calculo de las coordenadas medias de cada provincia
      const coordsmedias = Object.keys(provincias).map(provincia => {
        const { cnt, sumX, sumY } = provincias[provincia];  // Esto se pilla bien?

        return {
          provincia,
          coords: [sumX / cnt, sumY / cnt],
          total: provincias[provincia].total,
          mujeres: provincias[provincia].mujeres,
          varones: provincias[provincia].varones
        }
      });

      // Representa cada localidad y su frecuencia en el mapa
      coordsmedias.forEach(coord => {
        // FIltramos por frecuencia
        if (coord.total > 10) {
          // Punto para mostrar la localidad con la altura del cubo siendo los datos a representar
          const geometria = new THREE.BoxGeometry(0.05, coord.total / 50, 0.05);
          const material = new THREE.MeshBasicMaterial({ color: 0x86EBC5 });
          const cuboMesh = new THREE.Mesh(geometria, material);

          // Situa la barra y la añade al grupo
          cuboMesh.position.set(coord.coords[0] + 5, coord.coords[1] - 34.5 + (coord.total / 100), 31);
          grupoParo.add(cuboMesh);
          
          // Etiqueta de la localidad y su frecuencia
          floader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
            const textSprite = createTextSprite(`${coord.provincia}:${coord.total}`);
            
            textSprite.position.set(coord.coords[0] + 5.7, coord.coords[1] - 35, 31);
            textSprite.material.depthTest = false;
            textSprite.material.depthWrite = false;
            grupoParo.add(textSprite);
          });
          
          // Añade el grupo a la escena
          scene.add(grupoParo);
        }
      })
    })
    .catch(error => {
      console.log("[JobMap3D] Ha ocurrido un error obteniendo las estadísticas de paro.")
      console.log(error);
    });
}
//#endregion
//#region Paro con filtros
function fetchParoByFilter(lista_fechas, filter_type) {
  fetch('/jobmapweb/static/paro-provincias.geojson')
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al cargar el archivo GeoJSON de estadísticas de paro');
      }

      return response.json();
    })
    .then(data => {
      scene.remove(grupoParo);
      grupoParo = new THREE.Group();

      hideGrupo(grupoOfertas);
      hideGrupo(grupoContratos);

      // Procesamiento del geojson
      const provincias = {};

      data.features.forEach((feature) => {
        // Si el punto son los creditos finales, los salta
        if (!feature.geometry)
          return;

        if (lista_fechas.some(fecha => feature.properties.fecha.startsWith(fecha)))
        {
            
          const provincia = feature.properties.nombre_territorio;
          const [lon, lat] = feature.geometry.coordinates;

          // Si la provincia no estaba en la lista, se añade
          if (!provincias[provincia])
            provincias[provincia] = { cnt: 0, total: 0, mujeres: 0, varones: 0, menos_25: 0, mas_25: 0, de_25_45: 0, mas_45: 0, sumX: 0, sumY: 0 };

          // Se añaden los datos de la provincia actual al vector
          provincias[provincia].cnt++;
          provincias[provincia].sumX += lon;
          provincias[provincia].sumY += lat;
          provincias[provincia].total += feature.properties.total;
          provincias[provincia].mujeres += feature.properties.mujer;
          provincias[provincia].varones += feature.properties.varon;
          provincias[provincia].menos_25 += feature.properties.edad_menor_25;
          provincias[provincia].mas_25 += feature.properties.edad_mayor_25;
          provincias[provincia].de_25_45 += feature.properties.edad_entre_25_45;
          provincias[provincia].mas_45 += feature.properties.edad_mayor_45;
        }
      });

      // Calculo de las coordenadas medias de cada provincia. Aplicamos el filtro
      const coordsmedias = Object.keys(provincias).map(provincia => {
        const { cnt, sumX, sumY } = provincias[provincia];  // Esto se pilla bien?

        return {
          provincia,
          coords: [sumX / cnt, sumY / cnt],
          total: provincias[provincia].total,
          mujeres: provincias[provincia].mujeres,
          varones: provincias[provincia].varones,
          menos_25: provincias[provincia].menos_25,
          mas_25: provincias[provincia].mas_25,
          de_25_45: provincias[provincia].de_25_45,
          mas_45: provincias[provincia].mas_45
        }
      });

      // Representa cada localidad y su frecuencia en el mapa
      coordsmedias.forEach(coord => {
        // FIltramos por frecuencia
        if (coord.total > 10) {
          // Punto para mostrar la localidad con la altura del cubo siendo los datos a representar
          const geometria = new THREE.BoxGeometry(0.05, coord.total / 1000000, 0.05);
          const material = new THREE.MeshBasicMaterial({ color: 0x86EBC5 });
          const cuboMesh = new THREE.Mesh(geometria, material);

          // Situa la barra y la añade al grupo
          cuboMesh.position.set(coord.coords[0] + 5, coord.coords[1] - 34.5 + (coord.total / 2000000), 31);
          grupoParo.add(cuboMesh);
          
          // Etiqueta de la localidad y su frecuencia
          floader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
            let textSprite;
            switch (filter_type) {
              case 'varon':
                textSprite = createTextSprite(`${coord.provincia}:${coord.varones}`);
                break;
              case 'mujer':
                textSprite = createTextSprite(`${coord.provincia}:${coord.mujeres}`);
                break;
              case 'menos_25':
                textSprite = createTextSprite(`${coord.provincia}:${coord.menos_25}`);
                break;
              case 'mas_25':
                textSprite = createTextSprite(`${coord.provincia}:${coord.mas_25}`);
                break;
              case 'de_25_45':
                textSprite = createTextSprite(`${coord.provincia}:${coord.de_25_45}`);
                break;
              case 'mas_45':
                textSprite = createTextSprite(`${coord.provincia}:${coord.mas_45}`);
                break;
                default:
                textSprite = createTextSprite(`${coord.provincia}:${coord.total}`);
                break;
            }
            
            textSprite.position.set(coord.coords[0] + 5.7, coord.coords[1] - 35, 31);
            textSprite.material.depthTest = false;
            textSprite.material.depthWrite = false;
            grupoParo.add(textSprite);
          });
          
          // Añade el grupo a la escena
          scene.add(grupoParo);
        }
      })
    })
    .catch(error => {
      console.log("[JobMap3D] Ha ocurrido un error obteniendo las estadísticas de paro.")
      console.log(error);
    });
}
//#endregion

//#region Fetch de contratos
// Función que obtiene los datos de los contratos realizados en CyL
function fetchContratos() {
  fetch('/jobmapweb/static/contratos-realizados.geojson')
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al cargar el archivo GeoJSON de contratos.');
      }

      return response.json();
    })
    .then(data => {
      scene.remove(grupoContratos);
      grupoContratos = new THREE.Group();

      hideGrupo(grupoOfertas);
      hideGrupo(grupoParo);

      // Procesamiento del geojson
      const provincias = {};

      data.features.forEach((feature) => {
        // Si el punto son los creditos finales, los salta
        if (!feature.geometry)
          return;

        const provincia = feature.properties.nombre_territorio;
        const [lon, lat] = feature.geometry.coordinates;
    
        // Si la provincia no estaba en la lista, se añade
        if (!provincias[provincia])
          provincias[provincia] = { cnt: 0, total: 0, indefinido: 0, temporal: 0, sumX: 0, sumY: 0 };

        // Se añaden los datos de la provincia actual al vector
        provincias[provincia].cnt++;
        provincias[provincia].sumX += lon;
        provincias[provincia].sumY += lat;
        provincias[provincia].total += feature.properties.total;
        provincias[provincia].indefinido += feature.properties.indefinido;
        provincias[provincia].temporal += feature.properties.temporal;
      });

      // Calculo de las coordenadas medias de cada localidad
      const coordsmedias = Object.keys(provincias).map(provincia => {
        const { cnt, sumX, sumY } = provincias[provincia];
        return {
          provincia,
          coords: [sumX / cnt, sumY / cnt],
          total: provincias[provincia].total,
          indefinido: provincias[provincia].indefinido,
          temporal: provincias[provincia].temporal
        }
      });

      // Representa cada localidad y su frecuencia en el mapa
      coordsmedias.forEach(coord => {
        // FIltramos por frecuencia
        if (coord.total > 10) {
          // Punto para mostrar la localidad con la altura del cubo siendo los datos a representar
          const geometria = new THREE.BoxGeometry(0.05, coord.total / 50, 0.05);
          const material = new THREE.MeshBasicMaterial({ color: 0x868EEB });
          const cuboMesh = new THREE.Mesh(geometria, material);

          // Situa la barra y la añade al grupo
          cuboMesh.position.set(coord.coords[0] + 5, coord.coords[1] - 34.5 + (coord.total / 100), 31);
          grupoContratos.add(cuboMesh);
          
          // Etiqueta de la localidad y su frecuencia
          floader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
            const textSprite = createTextSprite(`${coord.provincia}:${coord.total}`);
            
            textSprite.position.set(coord.coords[0] + 5.7, coord.coords[1] - 35, 31);
            textSprite.material.depthTest = false;
            textSprite.material.depthWrite = false;
            grupoContratos.add(textSprite);
          });
          
          // Añade el grupo a la escena
          scene.add(grupoContratos);
        }
      })

    })
    .catch(error => {
      console.log("[JobMap3D] Ha ocurrido un error obteniendo los datos de contratos realizados.")
      console.log(error);
    });
}
//#endregion
//#region Contratos con filtros
function fetchContratosByFilter(lista_fechas, filter_type) {
  fetch('/jobmapweb/static/contratos-realizados.geojson')
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al cargar el archivo GeoJSON de estadísticas de contratos');
      }

      return response.json();
    })
    .then(data => {
      scene.remove(grupoContratos);
      grupoContratos = new THREE.Group();

      hideGrupo(grupoOfertas);
      hideGrupo(grupoParo);

      // Procesamiento del geojson
      const provincias = {};

      data.features.forEach((feature) => {
        // Si el punto son los creditos finales, los salta
        if (!feature.geometry)
          return;

        if (lista_fechas.some(fecha => feature.properties.fecha.startsWith(fecha)))
        {
            
          const provincia = feature.properties.nombre_territorio;
          const [lon, lat] = feature.geometry.coordinates;

          // Si la provincia no estaba en la lista, se añade
          if (!provincias[provincia])
            provincias[provincia] = { cnt: 0, total: 0, indefinido: 0, temporal: 0, sumX: 0, sumY: 0 };

          // Se añaden los datos de la provincia actual al vector
          provincias[provincia].cnt++;
          provincias[provincia].sumX += lon;
          provincias[provincia].sumY += lat;
          provincias[provincia].total += feature.properties.total;
          provincias[provincia].indefinido += feature.properties.indefinido;
          provincias[provincia].temporal += feature.properties.temporal;
        }
      });

      // Calculo de las coordenadas medias de cada provincia.
      const coordsmedias = Object.keys(provincias).map(provincia => {
        const { cnt, sumX, sumY } = provincias[provincia];  // Esto se pilla bien?

        return {
          provincia,
          coords: [sumX / cnt, sumY / cnt],
          total: provincias[provincia].total,
          indefinido: provincias[provincia].indefinido,
          temporal: provincias[provincia].temporal
        }
      });

      // Representa cada localidad y su frecuencia en el mapa. Aplicamos el filtro
      coordsmedias.forEach(coord => {
        // FIltramos por frecuencia
        if (coord.total > 10) {
          // Punto para mostrar la localidad con la altura del cubo siendo los datos a representar
          const geometria = new THREE.BoxGeometry(0.05, coord.total / 1000000, 0.05);
          const material = new THREE.MeshBasicMaterial({ color: 0x868EEB });
          const cuboMesh = new THREE.Mesh(geometria, material);

          // Situa la barra y la añade al grupo
          cuboMesh.position.set(coord.coords[0] + 5, coord.coords[1] - 34.5 + (coord.total / 2000000), 31);
          grupoContratos.add(cuboMesh);
          
          // Etiqueta de la localidad y su frecuencia
          floader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
            let textSprite;
            switch (filter_type) {
              case 'indefinido':
                textSprite = createTextSprite(`${coord.provincia}:${coord.indefinido}`);
                break;
              case 'temporal':
                textSprite = createTextSprite(`${coord.provincia}:${coord.temporal}`);
                break;
              default:
                textSprite = createTextSprite(`${coord.provincia}:${coord.total}`);
                break;
            }
            
            textSprite.position.set(coord.coords[0] + 5.7, coord.coords[1] - 35, 31);
            textSprite.material.depthTest = false;
            textSprite.material.depthWrite = false;
            grupoContratos.add(textSprite);
          });
          
          // Añade el grupo a la escena
          scene.add(grupoContratos);
        }
      })
    })
    .catch(error => {
      console.log("[JobMap3D] Ha ocurrido un error obteniendo las estadísticas de los contratos.")
      console.log(error);
    });
}
//#endregion

// TODO Use this function to make the camera look at the middle of the model when its created or reseted
// Positions the camera near the map model, and looks at it
function positionCamera(boundingBox) {
  const center = boundingBox.getCenter(new THREE.Vector3());
  const radius = boundingBox.getSize(new THREE.Vector3()).length() * 0.5;
  const distance = radius / Math.tan(Math.PI * camera.fov / 360);
  camera.position.set(center.x, center.y, center.z + distance);
  //controls.target.set( center.x, center.y, center.z );
  //controls.update()   // Orbit controls update must be called after manual camera changes
}

// TODO remake this function so it selects and changes the display of the map to a dashboard, geolocation color map, or frequency map.
function selectMapMode(mapMode) {

  let tagId;

  // If the tag is passed as a string with the id of the HTMLElement
  if (String(mapMode).includes('-')) {
    // Gets the color of the tag
    let tagTmp = mapMode.split('-');
    tagId = Number(tagTmp[1]);
  } else {
    // TODO check first it is a int, if no, alert
    tagId = Number(mapMode);
  }

  // Set the current color to the color the tag is associated with
  let tagColor = StrToRGB(document.getElementById("colorShow-" + tagId).style.background);

  if (!isTagActive) {
    // sets the new tag id, and color
    current_selectedTag = tagId;
    current_tagColor = tagColor;

    isTagActive = true;
  } else {
    // If there was an active tag and it was the same as the selected, resets it
    if (tagColor.toString() == current_tagColor.toString()) {
      // Reset currentTagColor
      current_selectedTag = 0;
      current_tagColor = StrToRGB(document.getElementById("colorShow-0").style.background);
      isTagActive = true;
    } else {
      // Change the current tag color and selected Id so it let other tags label as well
      current_selectedTag = tagId;
      current_tagColor = tagColor;
    }
  }
}

// TODO here would go the color conversion functions if they are needed

/* THREE.JS FUNCTIONALLITY */

// Resizes the renderer to its canvas size
function resizeCanvas() {
  const canvas = renderer.domElement;
  // Get the size of the canvas
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  // adjust the renderer to the canvas
  if (canvas.width !== width || canvas.height !== height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    //controls.update();  // Updates the arcball, just in case
  }
}

// TODO ADAPT THIS FUNCTION SO IT NOW CHANGES THE TYPE OF MAP DISPLAYED
// Change the visualizer mode. Right now -> 0: default, 1: locked, 2: panning, 3: rotate, 4: zooming TODO change numbers for an ENUM
function changeVisualizerMode(newMode) {
  if (current_mode == newMode) {
    current_mode = 0;   // Set it to default controls
    setControlsParams(true, true, true, true);
    // Checks if the controls are by default, or inverted
    if (!isBindInverted)
      setTBMouseControl("default");
    else
      setTBMouseControl("inverted");

    document.getElementById("canvasThree").style.cursor = "default";
    if (current_modelIcon != null) {
      current_modelIcon.style.opacity = 1;
      current_modelIcon.style.removeProperty('background-color');
      current_modelIcon = null;
    }
  } else {
    current_mode = newMode;
    if (!isBindInverted)
      setTBMouseControl("default");
    else
      setTBMouseControl("inverted");
    if (current_modelIcon != null) {    // Reset active effect of the active mode
      current_modelIcon.style.opacity = 1;
      current_modelIcon.style.removeProperty('background-color');
    }
    switch (current_mode) {
      case 0:
        // Default mode
        setControlsParams(true, true, true, true);
        document.getElementById("canvasThree").style.cursor = "default";
        current_modelIcon = null;
        break;
      case 1:
        // Select or Locked mode
        setControlsParams(false, true, true, true);
        document.getElementById("canvasThree").style.cursor = "crosshair";
        current_modelIcon = document.getElementById("lockIcon");
        break;
      case 2:
        // Pan mode. Changes cursor to movement cursos
        setControlsParams(true, true, false, false);
        setTBMouseControl("pan");
        document.getElementById("canvasThree").style.cursor = "all-scroll";
        current_modelIcon = document.getElementById("movementIcon");
        break;
      case 3:
        // Rotate mode
        setControlsParams(true, false, true, false);
        setTBMouseControl("rotate")
        document.getElementById("canvasThree").style.cursor = "grab";
        current_modelIcon = document.getElementById("rotateIcon");
        break;
      case 4:
        // Zoom mode
        setControlsParams(true, false, false, true);
        document.getElementById("canvasThree").style.cursor = "zoom-in";
        current_modelIcon = null;
        break;
      default:
        // Control for any unexpected values, set the visualizer to default
        setControlsParams(true, true, true, true);
        current_mode = 0;
        current_modelIcon = null;
        break;
    }
    // Sets the active one to opacity 0.6, as an active effect (TODO CHANGE THIS TO CHANGE COLOR OF ICON)
    if (current_modelIcon != null)
      current_modelIcon.style.backgroundColor = '#63a2ff';
  }
}

// Function that displays the loading icon, for long executions
function startLoadIcon() {
  // Lock flag to check the user doesnt missbehave while loading
  is_loading = true;
  // Shows the loading icon
  loadBack.style.display = "block";
  loadIcon.style.display = "block";
  // Starts the loading icon rotation
  loadingTimer = setInterval(showLoading, 1);
}

// Stops the loading corroutine
function stopLoadIcon() {
  clearInterval(loadingTimer);
  is_loading = false;
  loadRotation = 0;
  loadIcon.style.transform = "rotate(0)";
  loadIcon.style.display = "none";
  loadBack.style.display = "none";
}

// Corroutine that rotates the loading button
function showLoading() {
  loadIcon.style.transform = "rotate(" + loadRotation + "deg)";
  loadRotation++;
  if (loadRotation >= 360)
    loadRotation = 0;
}

// Reloads the app to its starting point (index)
function goToIndex() {
  location.replace("http://127.0.0.1:8000/")
}