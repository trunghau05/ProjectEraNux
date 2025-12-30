from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # OpenAPI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema')),

    # APIs
    path('api/students/', include('students.urls')),
    path('api/teachers/', include('teachers.urls')),
    path('api/subjects/', include('subjects.urls')),
    path('api/classes/', include('classes.urls')),
    path('api/bookings/', include('bookings.urls')),
    path('api/schedules/', include('schedules.urls')),
    path('api/sessions/', include('class_sessions.urls')),
    path('api/rooms/', include('rooms.urls')),
    path('api/login/', include('core.urls')),
]
