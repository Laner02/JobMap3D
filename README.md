# JobMap3D
A tridimensional visualizer of Castilla y León employement statistics for helping investigations and simple access to the data.

Proyecto de visualizador tridimensional de los datos estadísticos de empleo en Castilla y León como herramienta auxiliar en investigaciones.

## Descripción
La aplicación proporciona un fácil acceso a los datos de empleo mediante representación gráfica en un modelado tridimensional de la topografía de Castilla y León, ofreciendo una visualización intuitiva de los datos.

## Instalación
> ![WARNING]
> JobMap3D necesita del siguiente software para funcionar.

- Django v12+ link
- Python v11.8+ link
- Node.js v10+ link
- Vite v8+ link

Tras descargar el código fuente del proyecto, se deben cargar las dependencias del proyecto. Esto es automático mediante la ejecución del siguiente comando al nivel del fichero requirements.txt
```
pip install -r requirements.txt
```

## Despliegue
Para ejecutar la aplicación, se debe abrir un terminal en el directorio principal de la aplicación, al nivel del fichero manage.py y ejecutar el siguiente comando:
```
python manage.py runserver --noreload
```



## Controles
Se ha añadido la posibilidad de movimiento libre por la escena con los siguientes controles.
- **Botón izquierdo del ratón** para rotar la cámara alrededor del modelo.
- **Botón derecho del ratón** para desplazar la cámara libremente por la escena.
- **Rueda del ratón** para acercar o alejar la cámara al modelo.