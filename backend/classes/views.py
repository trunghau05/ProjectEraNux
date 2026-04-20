from datetime import datetime, timedelta

from django.db.models import Count
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination

from drf_spectacular.utils import extend_schema, OpenApiParameter

from core.models import Class, InClass, Schedule, Session, Student
from core.serializers import (
    ClassSerializer,
    ClassDetailSerializer,
    ClassRegistrationSerializer,
    ClassRegistrationResponseSerializer,
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

    queryset = Class.objects.select_related('subject', 'teacher').annotate(
        enrolled_students=Count('inclass')
    ).order_by('id')
    serializer_class = ClassSerializer
    
    class ClassPagination(PageNumberPagination):
        page_size = 20
        page_size_query_param = 'page_size'
        max_page_size = 100

    pagination_class = ClassPagination

    # =========================
    # SERIALIZER SWITCH
    # =========================
    def get_serializer_class(self):
        if self.action in [
            'list',
            'retrieve',
            'by_student',
            'by_teacher'
        ]:
            return ClassDetailSerializer
        if self.action == 'register_student':
            return ClassRegistrationSerializer
        return ClassSerializer

    def _get_first_occurrence_date(self, start_date, day_of_week):
        week_monday = start_date - timedelta(days=start_date.weekday())
        return week_monday + timedelta(days=day_of_week)

    def _combine_schedule_datetime(self, date_value, time_value):
        naive_datetime = datetime.combine(date_value, time_value)
        if timezone.is_naive(naive_datetime):
            return timezone.make_aware(naive_datetime, timezone.get_current_timezone())
        return naive_datetime

    # =========================
    # QUERY PARAM FILTER
    # =========================
    def get_queryset(self):
        queryset = Class.objects.select_related(
            'subject',
            'teacher'
        ).annotate(
            enrolled_students=Count('inclass')
        ).order_by('id')

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
        ).annotate(
            enrolled_students=Count('inclass')
        ).filter(
            id__in=InClass.objects.filter(
                student_id=student_id
            ).values_list('class_obj_id', flat=True)
        ).order_by('id')

        page = self.paginate_queryset(classes)
        if page is not None:
            serializer = ClassDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

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
        ).annotate(
            enrolled_students=Count('inclass')
        ).filter(teacher_id=teacher_id).order_by('id')

        page = self.paginate_queryset(classes)
        if page is not None:
            serializer = ClassDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ClassDetailSerializer(classes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=ClassRegistrationSerializer,
        responses={200: ClassRegistrationResponseSerializer},
        description='Register a student into a class, update class status, and generate sessions from schedules.'
    )
    @action(
        detail=True,
        methods=['post'],
        url_path='register-student'
    )
    def register_student(self, request, pk=None):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student_id = serializer.validated_data['student_id']

        with transaction.atomic():
            class_obj = get_object_or_404(
                Class.objects.select_for_update().select_related('teacher'),
                pk=pk
            )
            student = get_object_or_404(Student, pk=student_id)

            if class_obj.status in [Class.CLOSED, Class.COMPLETE]:
                return Response(
                    {'detail': 'Class is not open for registration.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if InClass.objects.filter(class_obj=class_obj, student=student).exists():
                return Response(
                    {'detail': 'Student is already enrolled in this class.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            enrolled_students = InClass.objects.select_for_update().filter(class_obj=class_obj).count()
            projected_students = enrolled_students + 1

            if projected_students > class_obj.max_students:
                return Response(
                    {'detail': 'Class is full. Registration denied.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            InClass.objects.create(class_obj=class_obj, student=student)

            if projected_students == class_obj.max_students:
                class_obj.status = Class.FULL
                class_obj.save(update_fields=['status'])

            schedules = Schedule.objects.filter(
                class_obj=class_obj,
                status=Schedule.ACTIVE,
            ).order_by('day_of_week', 'start_time')

            created_session_ids = []
            reused_session_ids = []

            for schedule in schedules:
                first_occurrence_date = self._get_first_occurrence_date(
                    schedule.start_date,
                    schedule.day_of_week,
                )

                for week_offset in range(schedule.repeat):
                    occurrence_date = first_occurrence_date + timedelta(days=week_offset * 7)
                    start_at = self._combine_schedule_datetime(occurrence_date, schedule.start_time)
                    end_at = self._combine_schedule_datetime(occurrence_date, schedule.end_time)

                    session_obj, created = Session.objects.get_or_create(
                        class_obj=class_obj,
                        teacher=class_obj.teacher,
                        start_at=start_at,
                        end_at=end_at,
                        defaults={
                            'status': Session.UPCOMING,
                            'student': None,
                            'time_slot': None,
                        }
                    )

                    if created:
                        created_session_ids.append(session_obj.id)
                    else:
                        reused_session_ids.append(session_obj.id)

        response_data = {
            'success': True,
            'message': 'Student registered successfully.',
            'class_status': class_obj.status,
            'enrolled_students': projected_students,
            'created_session_ids': created_session_ids,
            'reused_session_ids': reused_session_ids,
        }
        return Response(response_data, status=status.HTTP_200_OK)
