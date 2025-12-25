from rest_framework.viewsets import ModelViewSet
from core.models import Booking
from core.serializers import BookingSerializer


class BookingViewSet(ModelViewSet):
    """
    Booking API
    """
    queryset = Booking.objects.select_related(
        'student', 'time_slot', 'class_obj'
    )
    serializer_class = BookingSerializer
