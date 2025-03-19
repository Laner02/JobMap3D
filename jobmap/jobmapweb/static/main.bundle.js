// Main javascript file, prob better just making one file and setting all visualizer on here? Or make it pretty by creating more classes

// import { getCookie } from "../assets/utilities";

//#region Imports
//import * as THREE from 'three';
//import WebGL from 'three/addons/capabilities/WebGL.js';                         // WebGL compatibility
// import { ArcballControls } from 'three/addons/controls/ArcballControls.js';     // Arcball Controls
//import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
//import { getCookie, countElement } from './utilities.js';                                     // Utilities exportable functions
//#endregion

//#region Variables
// To be able to actually display smth with three.js, we need 3 things: camera, scene and renderer
/* SCENE */
const scene = new THREE.Scene();                    // Create a scene
const floader = new THREE.FontLoader();

scene.background = new THREE.Color( 0xdbdbd9 );     // Sets the scene background

/* CAMERA */
// Sets (FOV, aspect_ratio, near_clipping, far_clipping)
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 3000 );

/* LIGHTS */
scene.add( new THREE.HemisphereLight( 0xffffcc, 0x19bbdc, 1 ) );      // Set a global light for the scene

/* RENDERER */
// Set the renderer to render on the canvas already made on html, so i can control the size by CSS
const renderer = new THREE.WebGLRenderer( {canvas: document.getElementById("canvasThree")} );
renderer.setSize( window.innerWidth, window.innerHeight, false );          // Sets the size of the renderer
// TODO this down here we dont need
let getImageData = false;                   // Flag to know if the app wants to capture the canvas
let imgData;                                // String for the data of the img of the pc

/* POINTS OBJ */
let points;                                 // Define it here so we can use it on the file anytime
let pointGeometry;                          // Geometry of the points object on scene
let modelBoundingBox;                          // Bounding Box3 for the actual pointcloud points
let boundingBoxWireframe;                   // Box helper for the bounding box to be shown
let pcBoundBoxMeasures;                     // Measures of the box to display on the livepointaction
let pointsMaxDistance;                      // Max distance inside the pointcloud
let POINT_OG_SIZE = 0.5;                    // Point size by default
let POINT_SIZE = POINT_OG_SIZE + 0.25;      // Point size when hovered

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

/* WASD MOVEMENT */
const possible_movements = ['W', 'w', 'S', 's', 'A', 'a', 'D', 'd'];    // Array with all possible keys to move the camera

/* MOUSE POINTER */
let pointer, INTERSECTED;

/* FULLSCREEN FLAG */
let fsEnabled = false;
/* RENDERER CONTAINER */
let rCanvas = document.getElementById("viewerContainer");
/* USER IN POPUP FLAG */
// let isUserInPopup = false;                  // Flag to detect if the user is currently seeing a popup

/* CURRENT TAG ID */
let isTagActive = false;
let current_selectedTag = 0;            // Current tag selected ID. VOID(0) by default
let current_tagColor;
let oldPointColor = [0, 0, 0];
const DEFAULT_COLOR = [0, 0, 0];        // Default HSL color black, to erase, or CTRL+Z labeled points
let color;

/* TIMERS */
const POPUP_TIMER = 4000;       // 4 seconds
let isLocateActive = false;     // Flag to know what timer of locate is being set
let hideTimer;
let rulerTimer;
let hidetimerSize;
let mouseBeingPressed;          // Timer active while the mouse is being pressed
let loadingTimer;               // Timer for the loading interval
let infoPopupTimer;             // Timer for the info popup to show
let showMeasuresTimer;          // Timer for the live info to show the current box measures

/* VISUALIZER MODE */
let current_mode = 0;           // 0: default, 1: select/locked, 2: pan, 3: rotate, 4: zoom
let current_modelIcon;          // The HTML element icon of the mode active
let isShowingSizes = false;     // Flag to just display the box sizes once

/* Show/Hide Points & Focus */
let isTagShown;                 // Array with flags for each tag to check if they are shown or hidden
let isTagFocused;               // Array with flags for each label to check if its focused
let is_bbx_hidden;              // Flag to determine when the bounding boxes are hidden or shown

/* LABELING TOOLS */
let current_lbtool = 0;         // 0: single, 1: vector, 2: brush, 3: free, 4: eraser, 5: ruler, 6: polygon
let current_lbtoolIcon;         // The HTML element of the tool selected
let current_lbtoolsvg;          // The svg image of the selected tool
let isLabeling = true;          // Flag to check if the user can label or not

/* RULER SECTION */
let rulerStartPos;              // Starting position for the ruler tool

/* FREE SELECTION TOOL SECTION */
let curr_selection;             // Array of pt index (INTERSECTED) of the actual selection the user is doing
let curr_selection_trace;       // Array of Vector2, representing the mouse trace the user does
let isSelecting = false;        // Flag to know if the user is currently selecting
let startIntersecSegment;       // Starting point of the segment before intersection
let endIntersecSegment;         // Ending point of the segment after intersection
let isIdle = true;              // Flag to know when the user is not moving the controls

/* CANVAS FOR THE MOUSE TRACING */
let traceCanvas;
let ctx;
let curr_canvasPos;             // Last point drawn on canvas

/* POINTCLOUD LABEL ARRAY */
let pc_label_list;              // Array for the tag that each point on the pointcloud has
let color_list_db;              // Array with all posible colors in hsl, to set them when creating the model
let undoLabelList = [];         // Array of arrays with the labeling before the last movements are made, for UNDO feature
let redoLabelList = [];         // Array of arrays with the labeling after the last undo

/* AXES */
const axesHelper = new THREE.AxesHelper( 200 ); // TODO at the moment, 200 length, make it larger and/or config
const axesMini = new THREE.AxesHelper(2);       // Mini axes reference, to give the user a reference

/* USER CONFIGURABLE PARAMETERS */
let labelButton = "0";                          // Main labeling button value
let isBindInverted = false;                     // Flag that tells if the mouse bindings are inverted or not
let MOUSE_DEFAULT_CONTROLS = [2, 3, 1];         // Sets the default mouse buttons settings that will be used
const MOUSE_OG_DEFAULT_CONTROLS = [2, 3, 1];    // The default values set by the dev, for a reset buttons option
let VISUALIZER_DEFAULT_SP = [2, 1.5, 1];        // Sets the default value of visualizer speeds, may be modified by user
const VISUALIZER_OG_DEFAULT_SP = [1.2, 1.5, 1]; // Default values on reset of visualizer speeds
let isBoundBoxHidden = false;                   // Flag to know if the boundingbox is hidden or not

/* Load Icon Var */
let is_loading;                                 // Lock flag to assert the user doesnt missbehave while loading time happens
let loadIcon;                                   // Var storing the loading icon HTML element
let loadBack;                                   // Var storing the loading background pannel HTML element
let loadRotation = 0;                           // Value of the actual rotation of the loading icon
//#endregion

//#region event listeners
/* RESIZING EVT LISTENER */
// Listener for resizing event.
window.addEventListener( 'resize', () => {

    // Updates both the size of the camera space, and the renderer size
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Resize the trackballcontrols
    // controls.handleResize();

    renderer.setSize( window.innerWidth, window.innerHeight, false );

} );

// Append the renderer to the html document
document.getElementById( "viewerContainer" ).appendChild( renderer.domElement );
//#endregion

/* ARCBALL CONTROLS */
// Arcball doesnt need to call update on animate, and also takes the scene as a parameter
const controls = new THREE.OrbitControls( camera, renderer.domElement);
//controls.rotateSpeed = 1;           // By default is 1
//controls.cursorZoom = true;         // Makes the zoom center on the mouse cursor
// Changes the keybinding
// TODO make the user rotate with the left click
//controls.unsetMouseAction( 0 );                                 // TODO remember the preferences controls here later. Remember to add 0 to array, and if user changes, swap values, and use that array pos for onclick method TODO TODO
// controls.unsetMouseAction( 'WHEEL' );                           // TODO remember the preferences controls here later. Remember to add 0 to array, and if user changes, swap values, and use that array pos for onclick method TODO TODO
//controls.setMouseAction( 'ROTATE', MOUSE_DEFAULT_CONTROLS[0] ); // TODO by default, rotate is set to right mouse button, changable
//controls.setMouseAction( 'PAN', 1 );
//controls.setMouseAction( 'ZOOM', 'WHEEL' );
//controls.enableAnimations = true;
//controls.setGizmosVisible( false );
// Saves the state of the controls
//controls.saveState();

// Call the function that initializes all possible color gradients and stuff
//color_list_db = initilaizeTagDBArray();

// TODO TODO ANTES DE CREAR EL MODELO, OBTENER LOS DATOS DEL SERVIDOR

// Creates the Castilla y Leon 3D model
/* const loader = new THREE.STLLoader();
loader.load('/jobmapweb/static/cylRelieve.stl', function (geometry) {
    // Crear material y malla
    const material = new THREE.MeshStandardMaterial({ color: 0x0077ff, metalness: 0.5, roughness: 0.5 });
    const mesh = new THREE.Mesh(geometry, material);

    // Escalar el modelo si es necesario
    mesh.scale.set(0.1, 0.1, 0.1); // Ajusta la escala según sea necesario
    mesh.rotation.x = -Math.PI / 4; // Rotar para que quede horizontal
    scene.add(mesh);

    // Obtenemos bounding box del mapa
    const bbox = new THREE.Box3().setFromObject(mesh);
    console.log("Bounding Box:", bbox);

    // Mapeamos lat/lon dentro de la bounding box, marcando cuales son los límites de latitud y longitud de castilla y leon
    function latLonToModel(lat, lon) {
        const minLat = 40.0, maxLat = 43.5;
        const minLon = -7.0, maxLon = -2.0;

        const x = bbox.min.x + ((lon - minLon) / (maxLon - minLon)) * (bbox.max.x - bbox.min.x);
        const y = bbox.min.y + ((lat - minLat) / (maxLat - minLat)) * (bbox.max.y - bbox.min.y);

        return { x, y, z: bbox.max.z }; // Ubicar en la parte superior del modelo
    }

    // TODO Con este ejemplo, poner todos los datos del JSON donde correspondan sus latitudes y longitudes
    // Ejemplo: poner marcador en Valladolid
    const coords = latLonToModel(41.5, -4.7);

    const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );

    marker.position.set(coords.x, coords.y, coords.z);
    scene.add(marker);
  }); */

fetch('/jobmapweb/static/castilla_y_leon.geojson')
.then(response => {
    if (!response.ok) {
        throw new Error('Error al cargar el archivo GeoJSON');
    }
    
    return response.json();
})
.then(data => {
    //const geometria = new THREE.BufferGeometry();
    //const vertices = [];
    
      data.features.forEach((feature) => {
        const { geometry } = feature;
        
        if (geometry.type === "Polygon") {
            // Procesar un polígono
            addPolygonToScene(geometry.coordinates);
          } else if (geometry.type === "MultiPolygon") {
            // Procesar un multipolígono (varios conjuntos de coordenadas)
            geometry.coordinates.forEach((polygon) => {
              addPolygonToScene(polygon); // Añadir cada polígono
            });
          }
      });
})
.catch(error => {
    console.error('Error:', error);
});

function addPolygonToScene(coordinates) {
    
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
        depth: 1, // Grosor en el eje Z
        bevelEnabled: false // Sin biseles
      };
  
      // Crear geometría extruida
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  
      // Crear malla
      const mesh = new THREE.Mesh(geometry, material);
  
      // Añadir malla a la escena
      scene.add(mesh);

      // Crear los bordes visibles
        const edges = new THREE.EdgesGeometry(geometry); // Generar geometría de bordes
        const line = new THREE.LineSegments(edges, edgeMaterial); // Aplicar material a los bordes
        scene.add(line);
    });
  }
// Centramos la camara inicial para que se contemple correctamente el mapa
camera.position.set(10, 40, 10);

// Inicialmente se muestran las ofertas de empleo, al clickar el mapa, se esconden estas y se muestra otros datos
fetchOfertasEmpleo();

// Sets the raycaster for mouse interactions
raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.1;    // Raycasters for points need an specific threshold for the precision
pointer = new THREE.Vector2();

//#region General Events
window.onkeyup = function(event) {
    // TODO events that happen when the user stops pressing a key
}

window.onkeydown = function(event) {
    // TODO events that happen when the user starts pressing a key
}

window.onmousedown = function(event) {
    // TODO events that happen when the user starts pressing a mouse button
}

window.onmouseup = function(event) {
    // TODO events that happen when the user stops pressing a mouse button
}

// On pointer movement, tracks the mouse pointer 2d position
document.addEventListener( 'mousemove', (e) => {
    // When the pointer moves, save its coords
    let rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ( ( e.clientX - rect.left ) / rect.width ) * 2 - 1;
    pointer.y = - ( ( e.clientY - rect.top ) / rect.height ) * 2 + 1;       // negative or it will invert the Y axis
});

// Listener for the context menu inside the visualizer canvas, to prevent it from appearing on right-click
document.getElementById( "canvasThree" ).addEventListener('contextmenu', (e) => {
    e.preventDefault()
});

// TODO for testing purposes only
// Test function to see whats inside the scene
function checkScene() {
    console.log(scene);
}

/* ONLOAD FUNCTION */
// This function is called when the whole document is loaded
window.onload = function() {

    // Sets loading to true
    is_loading = true;

    // At this point, the map 3d model is already loaded

    // TODO set here all buttons event listeners

    /* TOOLBAR SECTION */
    // When the user clicks the logo
    document.getElementById( "appLogo" ).addEventListener( 'click', (e) => {
        goToIndex()     // TODO Add this function
        e.stopPropagation()
    })

    // TODO is this needed?

    // Saves the loading icon, for optimization
    loadIcon = document.getElementById( "loadIcon" );
    loadBack = document.getElementById( "loadBack" );
    //loadBack.style.display = "none";

    // Hides the loading screen panel
    document.getElementById( "loadingPanel" ).style.display = "none";

    // Sets loading to finished
    is_loading = false;
}

/* ANIMATE FUNCTION */
// Renders the scene with the camera given every frame. This method holds almost every action on runtime
function animate() {

    // TODO make a contition for animate?? So its optimized?
    requestAnimationFrame( animate );

    resizeCanvas();
    controls.update();

    render();   // TODO add the render function

}

/* ANIMATE EVERY FRAME */
// I initiate functions o other initializations here
animate();

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
    // TODO METER TODOS LOS PUNTOS EN UN GRUPO DE PUNTOS CON NOMBRE EMPLEO, Y ESCONDERLO SI SE CAMBIA DE MAPA

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
      const { cnt, sumX, sumY } = localidades[localidad];
      return {
        localidad,
        coords: [sumX/cnt, sumY/cnt],
        frecuencia: cnt
      }
    });

    // Representa cada localidad y su frecuencia en el mapa
    coordsmedias.forEach(coord => {
      // Punto para mostrar la localidad
      const geometria = new THREE.SphereGeometry(0.05, 32, 32);
      const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const puntoMesh = new THREE.Mesh(geometria, material);

      // Situa el punto
      puntoMesh.position.set(coord.coords[0], coord.coords[1], 0);
      scene.add(puntoMesh);

      // Etiqueta de la localidad y su frecuencia
      floader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const textGeometry = new THREE.TextGeometry(`Localidad: ${coord.localidad}\nFrecuencia: ${coord.frecuencia}`, {
            font: font,
            size: 1,
            height: 0.2,
        });
    
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(coord.coords[0], coord.coords[1], 0);
        scene.add(textMesh);
        console.log(textMesh)
      });
    
    })
  })
  .catch( error => {
    console.log("[JobMap3D] Ha ocurrido un error obteniendo las ofertas de empleo.")
    console.log(error);
  });
}

// Función que obtiene los datos de paro de la BD de CyL EN 2025
function fetchParo() {
  fetch('/jobmapweb/static/paro-provincias.geojson')
  .then(response => {
      if (!response.ok) {
          throw new Error('Error al cargar el archivo GeoJSON de estadísticas de paro');
      }
      
      return response.json();
  })
  .then(data => {
    // TODO METER TODOS LOS PUNTOS EN UN GRUPO DE PUNTOS CON NOMBRE EMPLEO, Y ESCONDERLO SI SE CAMBIA DE MAPA

    // Procesamiento del geojson
    const provincias = {};
    
    data.features.forEach((feature) => {
      // Si el punto son los creditos finales, los salta
      if (!feature.geometry)
        return;

      const provincia = feature.properties.nombre_territorio;
      const [lon, lat] = feature.geometry.coordinates;

      // TODO podemos añadir también filtros por fecha o filtros por edades
      
      // Si el registro no es del año adecuado se salta
      if (feature.properties.fecha.startsWith('2025-'))
      {
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
      }

    });

    // Calculo de las coordenadas medias de cada provincia
    const coordsmedias = Object.keys(provincias).map(provincia => {
      const { cnt, sumX, sumY } = provincias[provincia];  // Esto se pilla bien?
      // TODO eliminar
      console.log(cnt)
      console.log(sumX)
      console.log(sumY)
      return {
        provincia,
        coords: [sumX/cnt, sumY/cnt],
        total: provincias[provincia].total,
        mujeres: provincias[provincia].mujeres,
        varones: provincias[provincia].varones
      }
    });

    // Representa cada localidad y su frecuencia en el mapa
    coordsmedias.forEach(coord => {
      // Punto para mostrar la localidad
      const geometria = new THREE.SphereGeometry(0.05, 32, 32);
      const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const puntoMesh = new THREE.Mesh(geometria, material);

      // Situa el punto
      puntoMesh.position.set(coord.coords[0], coord.coords[1], 0);
      scene.add(puntoMesh);

      // Etiqueta de la localidad y su frecuencia de paro
      floader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const textGeometry = new THREE.TextGeometry(`Provincia: ${coord.provincia}\nTotal: ${coord.total}\nVaron: ${coord.varones} Mujer: ${coord.mujeres}`, {
            font: font,
            size: 1,
            height: 0.2,
        });
    
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(coord.coords[0], coord.coords[1], 0);
        scene.add(textMesh);
      });
    
    })
  })
  .catch( error => {
    console.log("[JobMap3D] Ha ocurrido un error obteniendo las estadísticas de paro.")
    console.log(error);
  });
}


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
    // TODO METER TODOS LOS PUNTOS EN UN GRUPO DE PUNTOS CON NOMBRE EMPLEO, Y ESCONDERLO SI SE CAMBIA DE MAPA

    // Procesamiento del geojson
    const provincias = {};
      
    data.features.forEach((feature) => {
      // Si el punto son los creditos finales, los salta
      if (!feature.geometry)
        return;

      const provincia = feature.properties.nombre_territorio;
      const [lon, lat] = feature.geometry.coordinates;

      // TODO podemos añadir también filtros por fecha o filtros por edades
      
      // Si el registro no es del año adecuado se salta
      if (feature.properties.fecha.startsWith('2025-'))
      {
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

    // Calculo de las coordenadas medias de cada localidad
    const coordsmedias = Object.keys(provincias).map(provincia => {
      const { cnt, sumX, sumY } = provincias[provincia];
      return {
        provincia,
        coords: [sumX/cnt, sumY/cnt],
        total: provincias[provincia].total,
        indefinido: provincias[provincia].indefinido,
        temporal: provincias[provincia].temporal
      }
    });

    // Representa cada provincia y su frecuencia en el mapa
    coordsmedias.forEach(coord => {
      // Punto para mostrar la provincia
      const geometria = new THREE.SphereGeometry(0.05, 32, 32);
      const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const puntoMesh = new THREE.Mesh(geometria, material);

      // Situa el punto
      puntoMesh.position.set(coord.coords[0], coord.coords[1], 0);
      scene.add(puntoMesh);

      // Etiqueta de la provincia y su tasa de contratos
      floader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const textGeometry = new THREE.TextGeometry(`Provincia: ${coord.provincia}\nTotal: ${coord.total}\nIndefinido: ${coord.indefinido} Temporal: ${coord.temporal}`, {
            font: font,
            size: 1,
            height: 0.2,
        });
    
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(coord.coords[0], coord.coords[1], 0);
        scene.add(textMesh);
      });
    
    })
  })
  .catch( error => {
    console.log("[JobMap3D] Ha ocurrido un error obteniendo los datos de contratos realizados.")
    console.log(error);
  });
}


// TODO Use this function to make the camera look at the middle of the model when its created or reseted
// Positions the camera near the map model, and looks at it
function positionCamera( boundingBox ) {
    const center = boundingBox.getCenter( new THREE.Vector3() );
    const radius = boundingBox.getSize( new THREE.Vector3() ).length() * 0.5;
    const distance = radius / Math.tan( Math.PI * camera.fov / 360 );
    camera.position.set( center.x, center.y, center.z + distance );
    //controls.target.set( center.x, center.y, center.z );
    //controls.update()   // Orbit controls update must be called after manual camera changes
}

// Renders the scene on runtime, detecting interactions with pointclouds
function render() {
    // TODO Here code what happens each frame, code here the raycasting functionality
    renderer.render(scene, camera);
}

// Locates the point with the id received and returns a Vector3 with its position. Saves accessing attributes.
// TODO Adapt this to the new map model positioning and geometry
function getPointPos(pointId) {
    const geometry = points.geometry;
    const attributes = geometry.attributes;

    // Gets the actual point index inside the position array
    const pointIndex = pointId * 3 % attributes.position.array.length;
    
    let position = new THREE.Vector3( attributes.position.array[pointIndex], attributes.position.array[pointIndex+1], attributes.position.array[pointIndex+2] );

    return position;
}

// Gets the distance from the controls camera obj to the target object (the map 3d model) centroid
function getDistanceToMap() {
    //return controls.camera.position.distanceTo(controls.target);
}

// TODO remake this function so it selects and changes the display of the map to a dashboard, geolocation color map, or frequency map.
function selectMapMode(mapMode) {

    let tagId;

    // If the tag is passed as a string with the id of the HTMLElement
    if ( String(mapMode).includes('-') ) {
        // Gets the color of the tag
        let tagTmp = mapMode.split('-');
        tagId = Number(tagTmp[1]);
    } else {
        // TODO check first it is a int, if no, alert
        tagId = Number(mapMode);
    }

    // Set the current color to the color the tag is associated with
    let tagColor = StrToRGB( document.getElementById("colorShow-" + tagId).style.background );

    if ( !isTagActive ) {
        // sets the new tag id, and color
        current_selectedTag = tagId;
        current_tagColor = tagColor;

        isTagActive = true;
    } else {
        // If there was an active tag and it was the same as the selected, resets it
        if( tagColor.toString() == current_tagColor.toString() ) {
            // Reset currentTagColor
            current_selectedTag = 0;
            current_tagColor = StrToRGB( document.getElementById("colorShow-0").style.background );
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

// Resets the camera to its original position, angle and zoom (works perfectly and fast)
function resetCamera() {
    //controls.reset();       // Resets controls so they work fine
    positionCamera(pcBoundingBox);
    //controls.update();
    camera.rotation.set(0, 0, 0);
}

// TODO ADAPT THIS FUNCTION SO IT NOW CHANGES THE TYPE OF MAP DISPLAYED
// Change the visualizer mode. Right now -> 0: default, 1: locked, 2: panning, 3: rotate, 4: zooming TODO change numbers for an ENUM
function changeVisualizerMode(newMode) {
    if ( current_mode == newMode ) {
        current_mode = 0;   // Set it to default controls
        setControlsParams( true, true, true, true );
        // Checks if the controls are by default, or inverted
        if ( !isBindInverted )
            setTBMouseControl( "default" );
        else
            setTBMouseControl( "inverted" );

        document.getElementById( "canvasThree" ).style.cursor = "default";
        if ( current_modelIcon != null ) {
            current_modelIcon.style.opacity = 1;
            current_modelIcon.style.removeProperty( 'background-color' );
            current_modelIcon = null;
        }
    } else {
        current_mode = newMode;
        if ( !isBindInverted )
            setTBMouseControl( "default" );
        else
            setTBMouseControl( "inverted" );
        if ( current_modelIcon != null ) {    // Reset active effect of the active mode
            current_modelIcon.style.opacity = 1;
            current_modelIcon.style.removeProperty( 'background-color' );
        }
        switch ( current_mode ) {
            case 0:
                // Default mode
                setControlsParams( true, true, true, true );
                document.getElementById( "canvasThree" ).style.cursor = "default";
                current_modelIcon = null;
                break;
            case 1:
                // Select or Locked mode
                setControlsParams( false, true, true, true );
                document.getElementById( "canvasThree" ).style.cursor = "crosshair";
                current_modelIcon = document.getElementById( "lockIcon" );
                break;
            case 2:
                // Pan mode. Changes cursor to movement cursos
                setControlsParams( true, true, false, false );
                setTBMouseControl("pan");
                document.getElementById( "canvasThree" ).style.cursor = "all-scroll";
                current_modelIcon = document.getElementById( "movementIcon" );
                break;
            case 3:
                // Rotate mode
                setControlsParams( true, false, true, false );
                setTBMouseControl("rotate")
                document.getElementById( "canvasThree" ).style.cursor = "grab";
                current_modelIcon = document.getElementById( "rotateIcon" );
                break;
            case 4:
                // Zoom mode
                setControlsParams( true, false, false, true );
                document.getElementById( "canvasThree" ).style.cursor = "zoom-in";
                current_modelIcon = null;
                break;
            default:
                // Control for any unexpected values, set the visualizer to default
                setControlsParams( true, true, true, true );
                current_mode = 0;
                current_modelIcon = null;
                break;
        }
        // Sets the active one to opacity 0.6, as an active effect (TODO CHANGE THIS TO CHANGE COLOR OF ICON)
        if ( current_modelIcon != null )
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
    loadingTimer = setInterval( showLoading, 1 );
}

// Stops the loading corroutine
function stopLoadIcon() {
    clearInterval( loadingTimer );
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