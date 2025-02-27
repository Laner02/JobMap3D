// Main javascript file, prob better just making one file and setting all visualizer on here? Or make it pretty by creating more classes

//#region Imports
import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';                         // WebGL compatibility
import { ArcballControls } from 'three/addons/controls/ArcballControls.js';     // Arcball Controls
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { getCookie } from './utilities.js';                                     // Utilities exportable functions
//#endregion

//#region Variables
// To be able to actually display smth with three.js, we need 3 things: camera, scene and renderer
/* SCENE */
const scene = new THREE.Scene();                    // Create a scene
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
const controls = new ArcballControls( camera, renderer.domElement, scene );
controls.rotateSpeed = 1;           // By default is 1
controls.cursorZoom = true;         // Makes the zoom center on the mouse cursor
// Changes the keybinding
// TODO make the user rotate with the left click
controls.unsetMouseAction( 0 );                                 // TODO remember the preferences controls here later. Remember to add 0 to array, and if user changes, swap values, and use that array pos for onclick method TODO TODO
// controls.unsetMouseAction( 'WHEEL' );                           // TODO remember the preferences controls here later. Remember to add 0 to array, and if user changes, swap values, and use that array pos for onclick method TODO TODO
controls.setMouseAction( 'ROTATE', MOUSE_DEFAULT_CONTROLS[0] ); // TODO by default, rotate is set to right mouse button, changable
controls.setMouseAction( 'PAN', 1 );
controls.setMouseAction( 'ZOOM', 'WHEEL' );
controls.enableAnimations = true;
controls.setGizmosVisible( false );
// Saves the state of the controls
controls.saveState();

// Call the function that initializes all possible color gradients and stuff
color_list_db = initilaizeTagDBArray();

// Creates the Castilla y Leon 3D model
createModel();

// Sets the raycaster for mouse interactions
// The Points.threshold is like """the size of the raycast""". Its actually how the raycast detects the sphere computed by the points class but yeag
// As the threshold is the precision, if its too precise, it might affect the performance
// Create Raycasts, and mouse position
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

