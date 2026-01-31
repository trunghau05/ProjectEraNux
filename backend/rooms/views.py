from rest_framework.viewsets import ModelViewSet
from core.models import Room
from core.serializers import RoomSerializer, RoomDetailSerializer


class RoomViewSet(ModelViewSet):
    """
    Room API
    """
    queryset = Room.objects.select_related('session')
    serializer_class = RoomSerializer

    def get_serializer_class(self):
        """
        Use RoomDetailSerializer for read operations (list, retrieve)
        Use RoomSerializer for write operations (create, update, partial_update)
        """
        if self.action in ['list', 'retrieve']:
            return RoomDetailSerializer
        return RoomSerializer
