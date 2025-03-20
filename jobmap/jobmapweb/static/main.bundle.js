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

/* MOUSE POINTER */
let pointer;

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
controls.panSpeed = 0.1;            // 0.3 por defecto
controls.rotateSpeed = 0.2;           // 1 por defecto
controls.zoomSpeed = 0.1;           // 1.2 por defecto
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
        addPolygonToScene(geometry.coordinates, 'none', modeloCyL);
      } else if (geometry.type === "MultiPolygon") {
        // Para procesar un multipolígono (varios conjuntos de coordenadas)
        geometry.coordinates.forEach((polygon) => {
          addPolygonToScene(polygon, 'none', modeloCyL);
        });
      }
    });
  })
  .catch(error => {
    console.error('Error:', error);
  });

function addPolygonToScene(coordinates, color, group) {

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x000000, // Color negro para los bordes
    linewidth: 1 // Grosor de la línea
  });

  // Se decide el color del modelo
  let material;

  // Si el mapa no tiene color
  if (color == 'none')
  {
    material = new THREE.MeshPhongMaterial({
      color: 0x87ceeb,
      side: THREE.DoubleSide, // Renderizado en ambos lados
      flatShading: true       // Sombreado plano para resaltar bordes
    });
  } else if (color == 'green') {
    material = new THREE.MeshPhongMaterial({
      color: 0x77dd77,
      side: THREE.DoubleSide, // Renderizado en ambos lados
      flatShading: true       // Sombreado plano para resaltar bordes
    });    
  } else {
    material = new THREE.MeshPhongMaterial({
      color: 0xff6961,
      side: THREE.DoubleSide, // Renderizado en ambos lados
      flatShading: true       // Sombreado plano para resaltar bordes
    });
  }

  coordinates.forEach((ring) => {
    const shape = new THREE.Shape();

    ring.forEach(([x, y], index) => {
      if (index === 0) {
        shape.moveTo(x, y); // Primer punto
      } else {
        shape.lineTo(x, y);
      }
    });

    // Configura la profundidad
    const extrudeSettings = {
      depth: 0.4, // Grosor en el eje Z
      bevelEnabled: false
    };

    // Crea una geometría extruida
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(5, -34.5, 30.5)
    // Añade la malla al grupo del modelo 3D
    group.add(mesh);

    // Crea los bordes visibles
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
    modeloCrecimientoCyL.visible = false;
    data.features.forEach((feature) => {
      const { geometry } = feature;
      const nombre_provincia = feature.properties.name;

      fetch('/jobmapweb/static/paro-provincias.geojson')
      .then(response => {
        if (!response.ok) {
          throw new Error('Error al cargar el archivo GeoJSON de estadísticas de paro');
        }
        return response.json();
      })
      .then(data => {
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

        // Calculo de la tasa de paro de la provincia
        const tasa_paro = Object.keys(provincias).map(provincia => {

          // Se busca la provincia deseada
          if (nombre_provincia == provincia) return provincias[provincia].total;

        });

        fetch('/jobmapweb/static/contratos-realizados.geojson')
        .then(response => {
          if (!response.ok) {
            throw new Error('Error al cargar el archivo GeoJSON de contratos.');
          }

          return response.json();
        })
        .then(data => {
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

          // Calculo de la tasa de nuevos contratos de la provincia
          const tasa_nuevos_contratos = Object.keys(provincias).map(provincia => {
            
            if (nombre_provincia == provincia) return provincias[provincia].total;

          });

          // Ahora ponemos el color al material de la provincia y la añadimos al modelo
          let color_provincia;
          console.log((tasa_nuevos_contratos.find(item => typeof item === "number") - tasa_paro.find(item => typeof item === "number")));
          if ((tasa_nuevos_contratos.find(item => typeof item === "number") - tasa_paro.find(item => typeof item === "number")) >= 0)
            color_provincia = 'green';
          else
            color_provincia = 'red';
          
          if (geometry.type === "Polygon") {
            // Para procesar un polígono
            addPolygonToScene(geometry.coordinates, color_provincia, modeloCrecimientoCyL);
          } else if (geometry.type === "MultiPolygon") {
            // Para procesar un multipolígono (varios conjuntos de coordenadas)
            geometry.coordinates.forEach((polygon) => {
              addPolygonToScene(polygon, color_provincia, modeloCrecimientoCyL);
            });
          }   
        })
        .catch(error => {
          console.log("[JobMap3D] Ha ocurrido un error obteniendo los datos de contratos realizados.")
          console.log(error);
        });
      })
      .catch(error => {
        console.log("[JobMap3D] Ha ocurrido un error obteniendo las estadísticas de paro.")
        console.log(error);
      });
    });
  })
  .catch(error => {
    console.error('Error:', error);
  });
//#endregion

//#region Cambio de mapa
// Funcion para cambiar el mapa activo al político
function showPoliticalMap() {
  hideGrupo(modeloCrecimientoCyL);
  showGrupo(modeloCyL);
}

// Funcion para cambiar el mapa activo al de crecimiento de empleo
function showGrowthMap() {
  hideGrupo(modeloCyL);
  showGrupo(modeloCrecimientoCyL);
}
//#endregion

// Centramos la camara inicial para que se contemple correctamente el mapa
camera.position.set(0, 7.9, 33);

// Inicialmente se muestran las ofertas de empleo, al clickar el mapa, se esconden estas y se muestra otros datos
fetchOfertasEmpleo();

pointer = new THREE.Vector2();
//#region General Events
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
  const political_map_button = document.getElementById("map-frec");
  const growth_map_button = document.getElementById("map-crec");

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

  // Event listeners para los botones de mapas
  political_map_button.addEventListener('click', showPoliticalMap );
  growth_map_button.addEventListener('click', showGrowthMap );

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
          
          // Borde para las frecuencias
          const edges = new THREE.EdgesGeometry(geometria);
          const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
          const wireframe = new THREE.LineSegments(edges, lineMaterial);
          
          // Se posicionan los bordes en la posicion del cubo
          wireframe.position.copy(cuboMesh.position);
          grupoOfertas.add(wireframe);

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
          
          // Borde para las frecuencias
          const edges = new THREE.EdgesGeometry(geometria);
          const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
          const wireframe = new THREE.LineSegments(edges, lineMaterial);
          
          // Se posicionan los bordes en la posicion del cubo
          wireframe.position.copy(cuboMesh.position);
          grupoOfertas.add(wireframe);

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
          
          // Borde para las frecuencias
          const edges = new THREE.EdgesGeometry(geometria);
          const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
          const wireframe = new THREE.LineSegments(edges, lineMaterial);
          
          // Se posicionan los bordes en la posicion del cubo
          wireframe.position.copy(cuboMesh.position);
          grupoParo.add(wireframe);

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
          
          // Borde para las frecuencias
          const edges = new THREE.EdgesGeometry(geometria);
          const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
          const wireframe = new THREE.LineSegments(edges, lineMaterial);
          
          // Se posicionan los bordes en la posicion del cubo
          wireframe.position.copy(cuboMesh.position);
          grupoParo.add(wireframe);

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
          
          // Borde para las frecuencias
          const edges = new THREE.EdgesGeometry(geometria);
          const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
          const wireframe = new THREE.LineSegments(edges, lineMaterial);
          
          // Se posicionan los bordes en la posicion del cubo
          wireframe.position.copy(cuboMesh.position);
          grupoContratos.add(wireframe);

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
          
          // Borde para las frecuencias
          const edges = new THREE.EdgesGeometry(geometria);
          const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
          const wireframe = new THREE.LineSegments(edges, lineMaterial);
          
          // Se posicionan los bordes en la posicion del cubo
          wireframe.position.copy(cuboMesh.position);
          grupoContratos.add(wireframe);

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

// Positions the camera near the map model, and looks at it
function positionCamera(boundingBox) {
  const center = boundingBox.getCenter(new THREE.Vector3());
  const radius = boundingBox.getSize(new THREE.Vector3()).length() * 0.5;
  const distance = radius / Math.tan(Math.PI * camera.fov / 360);
  camera.position.set(center.x, center.y, center.z + distance);
}

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