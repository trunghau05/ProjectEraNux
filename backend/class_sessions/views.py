from django.db.models import Q
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from core.models import Class, InClass, Session, Teacher
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
        if self.action in [
            'list',
            'retrieve',
            'by_student',
            'by_teacher',
            'by_tutor',
        ]:
            return SessionDetailSerializer
        return SessionSerializer

    # =========================
    # Custom Actions
    # =========================

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='student_id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Student ID. Returns tutor sessions by student_id and teacher class sessions via in_class.'
            )
        ],
        responses=SessionDetailSerializer(many=True),
        description='Get all sessions for a student, including tutor sessions and class sessions from enrolled classes.'
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
        class_ids = InClass.objects.filter(
            student_id=student_id
        ).values_list('class_obj_id', flat=True)

        sessions = self.queryset.filter(
            Q(student_id=student_id) |
            Q(class_obj_id__in=class_ids)
        ).distinct().order_by('start_at')
        serializer = self.get_serializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='teacher_id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Teacher ID. Returns only class-based sessions owned by this teacher.'
            )
        ],
        responses=SessionDetailSerializer(many=True),
        description='Get all class sessions for a teacher. Sessions must belong to classes owned by this teacher.'
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
        teacher = get_object_or_404(Teacher, pk=teacher_id)
        if teacher.role != Teacher.TEACHER:
            return Response(
                {'detail': 'This user is not a teacher.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        class_ids = Class.objects.filter(teacher_id=teacher_id).values_list('id', flat=True)
        sessions = self.queryset.filter(
            class_obj_id__in=class_ids,
            teacher_id=teacher_id,
            class_obj__isnull=False,
        ).distinct().order_by('start_at')

        serializer = self.get_serializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='tutor_id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Tutor ID. Returns only time-slot-based sessions owned by this tutor.'
            )
        ],
        responses=SessionDetailSerializer(many=True),
        description='Get all tutor sessions. Sessions must be linked to time slots owned by this tutor.'
    )
    @action(
        detail=False,
        methods=['get'],
        url_path='by-tutor/(?P<tutor_id>[^/.]+)'
    )
    def by_tutor(self, request, tutor_id=None):
        tutor = get_object_or_404(Teacher, pk=tutor_id)
        if tutor.role != Teacher.TUTOR:
            return Response(
                {'detail': 'This user is not a tutor.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        sessions = self.queryset.filter(
            time_slot__teacher_id=tutor_id,
            teacher_id=tutor_id,
            time_slot__isnull=False,
        ).distinct().order_by('start_at')

        serializer = self.get_serializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
