from rest_framework.routers import DefaultRouter

from .views import TimeSlotViewSet

router = DefaultRouter()
router.register(r'', TimeSlotViewSet, basename='time-slot')

urlpatterns = router.urls
