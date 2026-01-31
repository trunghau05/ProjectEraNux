from rest_framework.viewsets import ModelViewSet
from core.models import Schedule
from core.serializers import ScheduleSerializer, ScheduleDetailSerializer


class ScheduleViewSet(ModelViewSet):
    """
    Schedule API
    """
    queryset = Schedule.objects.select_related('class_obj')
    serializer_class = ScheduleSerializer

    def get_serializer_class(self):
        """
        Use ScheduleDetailSerializer for read operations (list, retrieve)
        Use ScheduleSerializer for write operations (create, update, partial_update)
        """
        if self.action in ['list', 'retrieve']:
            return ScheduleDetailSerializer
        return ScheduleSerializer
