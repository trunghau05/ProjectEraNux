from rest_framework.viewsets import ModelViewSet
from core.models import Room
from core.serializers import RoomSerializer


class RoomViewSet(ModelViewSet):
    """
    Room API
    """
    queryset = Room.objects.select_related('session')
    serializer_class = RoomSerializer
