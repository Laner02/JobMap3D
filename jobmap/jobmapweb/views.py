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