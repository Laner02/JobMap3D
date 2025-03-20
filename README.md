# JobMap3D
A tridimensional visualizer of Castilla y León employement statistics for helping investigations and simple access to the data.

Proyecto de visualizador tridimensional de los datos estadísticos de empleo en Castilla y León como herramienta auxiliar en investigaciones.

## Descripción
La aplicación proporciona un fácil acceso a los datos de empleo mediante representación gráfica en un modelado tridimensional de la topografía de Castilla y León, ofreciendo una visualización intuitiva de los datos.

## Instalación
> [!WARNING]
> JobMap3D necesita del siguiente software para funcionar.

- Django v12+ link
- Python v11.8+ link
- Node.js v10+ link
- Vite v8+ link

## Despliegue
Para ejecutar la aplicación, se debe abrir un terminal en el directorio principal de la aplicación, al nivel del fichero manage.py y ejecutar el siguiente comando:
```
cd ./jobmap
python manage.py runserver --noreload
```
Se mostrará una dirección web en el terminal (localhost) desde la que se podrá acceder a la herramienta directamente.
> [!WARNING]
> JobMap3D requiere de conexión a internet para descargar de forma dinámica las librerías de THREE.JS

## Controles
Se ha añadido la posibilidad de movimiento libre por la escena con los siguientes controles.
- **Botón izquierdo del ratón** para rotar la cámara alrededor del modelo.
- **Botón derecho del ratón** para desplazar la cámara libremente por la escena.
- **Rueda del ratón** para acercar o alejar la cámara al modelo.
