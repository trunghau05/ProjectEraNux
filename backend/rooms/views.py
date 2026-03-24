from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.decorators import action
from rest_framework.response import Response
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
        if self.action in ['list', 'retrieve', 'by_session']:
            return RoomDetailSerializer
        return RoomSerializer

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='session_id',
                type=int,
                location=OpenApiParameter.PATH,
                description='ID của session'
            )
        ],
        responses=RoomDetailSerializer,
        description='Get room by session id'
    )
    @action(
        detail=False,
        methods=['get'],
        url_path='by-session/(?P<session_id>[^/.]+)'
    )
    def by_session(self, request, session_id=None):
        """
        GET /rooms/by-session/{session_id}/
        """
        room = get_object_or_404(self.queryset, session_id=session_id)
        serializer = self.get_serializer(room)
        return Response(serializer.data)
