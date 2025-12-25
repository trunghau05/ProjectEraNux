from rest_framework.viewsets import ModelViewSet
from core.models import Subject
from core.serializers import SubjectSerializer


class SubjectViewSet(ModelViewSet):
    """
    Subject API:
    - GET    /api/subjects/
    - POST   /api/subjects/
    - GET    /api/subjects/{id}/
    - PUT    /api/subjects/{id}/
    - PATCH  /api/subjects/{id}/
    - DELETE /api/subjects/{id}/
    """
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
