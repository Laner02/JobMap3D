"""
URL configuration for jobmapapp project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path, re_path
from jobmapweb import views
from django.contrib.staticfiles.views import serve as serve_static

# Function to help load the static files
def _static_butler(request, path, **kwargs):
    """
    Serve static files using the django static files configuration
    WITHOUT collectstatic. This is slower, but very useful for API 
    only servers where the static files are really just for /admin
    Passing insecure=True allows serve_static to process, and ignores
    the DEBUG=False setting
    """
    return serve_static(request, path, insecure=True, **kwargs)

# app_name = "jobmap"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.index, name='index'),
    path('query_ofertas/', views.query_ofertas, name='query_ofertas'),
    path('query_paro/', views.query_paro, name='query_paro'),
    path('query_contratos/', views.query_contratos, name='query_contratos'),
]
