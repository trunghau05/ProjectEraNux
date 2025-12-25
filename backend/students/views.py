from rest_framework.viewsets import ModelViewSet
from core.models import Student
from core.serializers import StudentSerializer


class StudentViewSet(ModelViewSet):
    """
    Student API:
    - GET    /api/students/
    - POST   /api/students/
    - GET    /api/students/{id}/
    - PUT    /api/students/{id}/
    - PATCH  /api/students/{id}/
    - DELETE /api/students/{id}/
    """
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
