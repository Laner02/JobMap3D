from django.http import HttpRequest, HttpResponse, JsonResponse
from django.template import loader
from django.template.loader import render_to_string
from django.shortcuts import render


# Main view that loads the main page template
def index(request: HttpRequest) -> HttpResponse:
    """
    Loads the main page template.

    Args:
        request (HttpRequest): The request for the template.

    Returns:
        HttpResponse: The response with the template code.
    """
    # Loads the index template
    template = loader.get_template("index.html")
    # TODO do we need to send some data on the first context?
    context = {}

    print('[JOBMAP] Index: Loading index page')
    return HttpResponse(template.render(context, request))


# TODO hacer que dependiendo de los filtros se llame a una u otra vista
# Funcion que obtiene los datos de ofertas de empleo de la BD de CyL. Al completo
def query_ofertas(request: HttpRequest) -> JsonResponse:
    path = 'static/ofertas-de-empleo.geojson'

    

# Obtiene las localidades disponibles y la frecuencia entre ellas
# TODO hacer que esto devuelva un JSON con la localidad y la frecuencia
# TODO hacer estos metodos para el resto de mapas
def query_ofertas_freq_localidad():
    # TODO TAMBIEN OBTENER LA POSICION EXACTA DE CADA LOCALIDAD PARA REPRESENTARLA
    # TODO descargar el JSON en la API:
    query = "/api/explore/v2.1/catalog/datasets/ofertas-de-empleo/records?select=count(*)&group_by=localidad&limit=100"

    pass

# Obtiene las provincias y su frecuencia
def query_ofertas_freq_provincia():
    # TODO TAMBIEN OBTENER LA POSICION EXACTA DE CADA PROVINCIA PARA REPRESENTARLA
    # TODO descargar el JSON en la API:
    query = "/api/explore/v2.1/catalog/datasets/ofertas-de-empleo/records?select=count(*)&group_by=provincia&limit=100"
    pass


# Funcion que obtiene los datos de paro de la BD de CyL
def query_paro(request: HttpRequest) -> JsonResponse:
    pass


# Funcion que obtiene los datos de contratos realizados de la BD de CyL
def query_contratos(request: HttpRequest) -> JsonResponse:
    pass