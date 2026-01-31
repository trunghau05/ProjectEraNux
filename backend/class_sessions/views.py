from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema

from core.models import Session
from core.serializers import (
    SessionSerializer,
    SessionDetailSerializer
)


class SessionViewSet(ModelViewSet):
    """
    Session API ViewSet

    Provides:
    - CRUD operations for Session
    - Custom endpoints to get sessions by student or teacher
    """

    queryset = Session.objects.select_related(
        'class_obj',
        'teacher',
        'time_slot',
        'student'
    )

    serializer_class = SessionSerializer

    def get_serializer_class(self):
        """
        Return different serializer classes based on action.

        - Use detailed serializer for read operations (list, retrieve)
        - Use default serializer for write operations (create, update, partial_update)
        """
        if self.action in ['list', 'retrieve', 'by_student', 'by_teacher']:
            return SessionDetailSerializer
        return SessionSerializer

    # =========================
    # Custom Actions
    # =========================

    @extend_schema(
        responses=SessionDetailSerializer(many=True),
        description="Get all sessions of a specific student"
    )
    @action(
        detail=False,
        methods=['get'],
        url_path='by-student/(?P<student_id>[^/.]+)'
    )
    def by_student(self, request, student_id=None):
        """
        GET /sessions/by-student/{student_id}/
        """
        sessions = self.queryset.filter(student_id=student_id)
        serializer = self.get_serializer(sessions, many=True)
        return Response(serializer.data)

    @extend_schema(
        responses=SessionDetailSerializer(many=True),
        description="Get all sessions of a specific teacher"
    )
    @action(
        detail=False,
        methods=['get'],
        url_path='by-teacher/(?P<teacher_id>[^/.]+)'
    )
    def by_teacher(self, request, teacher_id=None):
        """
        GET /sessions/by-teacher/{teacher_id}/
        """
        sessions = self.queryset.filter(teacher_id=teacher_id)
        serializer = self.get_serializer(sessions, many=True)
        return Response(serializer.data)
