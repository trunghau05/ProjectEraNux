from rest_framework.viewsets import ModelViewSet
from core.models import Teacher
from core.serializers import TeacherSerializer


class TeacherViewSet(ModelViewSet):
    """
    Teacher API:
    - GET    /api/teachers/
    - POST   /api/teachers/
    - GET    /api/teachers/{id}/
    - PUT    /api/teachers/{id}/
    - PATCH  /api/teachers/{id}/
    - DELETE /api/teachers/{id}/
    """
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer
