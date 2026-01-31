from rest_framework.viewsets import ModelViewSet
from core.models import Booking
from core.serializers import BookingSerializer, BookingDetailSerializer


class BookingViewSet(ModelViewSet):
    """
    Booking API
    """
    queryset = Booking.objects.select_related(
        'student', 'time_slot', 'teacher'
    )
    serializer_class = BookingSerializer

    def get_serializer_class(self):
        """
        Use BookingDetailSerializer for read operations (list, retrieve)
        Use BookingSerializer for write operations (create, update, partial_update)
        """
        if self.action in ['list', 'retrieve']:
            return BookingDetailSerializer
        return BookingSerializer
