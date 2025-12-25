from rest_framework.viewsets import ModelViewSet
from core.models import Schedule
from core.serializers import ScheduleSerializer


class ScheduleViewSet(ModelViewSet):
    """
    Schedule API
    """
    queryset = Schedule.objects.select_related('class_obj')
    serializer_class = ScheduleSerializer
