from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

from drf_spectacular.utils import extend_schema, OpenApiParameter

from core.models import Class, InClass
from core.serializers import (
    ClassSerializer,
    ClassDetailSerializer
)


class ClassViewSet(ModelViewSet):
    """
    Class API:
    - GET /classes/
    - GET /classes/{id}/
    - GET /classes/?student_id=
    - GET /classes/?teacher_id=
    - GET /classes/by-student/{student_id}/
    - GET /classes/by-teacher/{teacher_id}/
    """

    queryset = Class.objects.select_related('subject', 'teacher')
    serializer_class = ClassSerializer

    # =========================
    # SERIALIZER SWITCH
    # =========================
    def get_serializer_class(self):
        if self.action in [
            'retrieve',
            'by_student',
            'by_teacher'
        ]:
            return ClassDetailSerializer
        return ClassSerializer

    # =========================
    # QUERY PARAM FILTER
    # =========================
    def get_queryset(self):
        queryset = Class.objects.select_related(
            'subject',
            'teacher'
        )

        class_id = self.request.query_params.get('class_id')
        teacher_id = self.request.query_params.get('teacher_id')
        student_id = self.request.query_params.get('student_id')
        status_param = self.request.query_params.get('status')

        # filter theo class_id
        if class_id:
            queryset = queryset.filter(id=class_id)

        # filter theo teacher
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)

        # filter theo student (qua bảng in_class)
        if student_id:
            queryset = queryset.filter(
                id__in=InClass.objects.filter(
                    student_id=student_id
                ).values_list('class_obj_id', flat=True)
            )

        # filter theo status
        if status_param:
            queryset = queryset.filter(status=status_param)

        return queryset

    # =========================
    # GET CLASS BY STUDENT
    # =========================
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='student_id',
                type=int,
                location=OpenApiParameter.PATH,
                description='ID của student (từ bảng in_class)'
            )
        ],
        responses=ClassDetailSerializer(many=True)
    )
    @action(
        detail=False,
        methods=['get'],
        url_path='by-student/(?P<student_id>[^/.]+)'
    )
    def by_student(self, request, student_id=None):
        classes = Class.objects.select_related(
            'subject',
            'teacher'
        ).filter(
            id__in=InClass.objects.filter(
                student_id=student_id
            ).values_list('class_obj_id', flat=True)
        )

        serializer = ClassDetailSerializer(classes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # =========================
    # GET CLASS BY TEACHER
    # =========================
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='teacher_id',
                type=int,
                location=OpenApiParameter.PATH,
                description='ID của teacher'
            )
        ],
        responses=ClassDetailSerializer(many=True)
    )
    @action(
        detail=False,
        methods=['get'],
        url_path='by-teacher/(?P<teacher_id>[^/.]+)'
    )
    def by_teacher(self, request, teacher_id=None):
        classes = Class.objects.select_related(
            'subject',
            'teacher'
        ).filter(teacher_id=teacher_id)

        serializer = ClassDetailSerializer(classes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
