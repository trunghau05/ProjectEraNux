from rest_framework.viewsets import ModelViewSet
from core.models import Session
from core.serializers import SessionSerializer


class SessionViewSet(ModelViewSet):
    """
    Session API
    """
    queryset = Session.objects.select_related(
        'class_obj', 'teacher', 'booking'
    )
    serializer_class = SessionSerializer
