from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
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
    - GET    /api/teachers/tutors/  (List all tutors)
    """
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer

    @extend_schema(
        responses={200: TeacherSerializer(many=True)},
        description="Get list of all tutors"
    )
    @action(detail=False, methods=['get'], url_path='tutors')
    def list_tutors(self, request):
        """
        Get list of tutors only
        """
        tutors = Teacher.objects.filter(role=Teacher.TUTOR)
        serializer = self.get_serializer(tutors, many=True)
        return Response(serializer.data)
