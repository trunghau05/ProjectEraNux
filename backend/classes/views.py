from rest_framework.viewsets import ModelViewSet
from core.models import Class
from core.serializers import ClassSerializer


class ClassViewSet(ModelViewSet):
    """
    Class API
    """
    queryset = Class.objects.select_related('subject', 'teacher')
    serializer_class = ClassSerializer
