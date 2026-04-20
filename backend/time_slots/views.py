from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core.models import Booking, Teacher, TimeSlot
from core.serializers import TimeSlotDetailSerializer, TimeSlotSerializer


class TimeSlotViewSet(ModelViewSet):
    """
    Time slot API with filters by teacher and availability.
    """

    queryset = TimeSlot.objects.select_related('teacher').all().order_by('start_at')
    serializer_class = TimeSlotSerializer

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve', 'by_teacher', 'by_teacher_available']:
            return TimeSlotDetailSerializer
        return TimeSlotSerializer

    @extend_schema(
        responses={200: TimeSlotDetailSerializer(many=True)},
        description='Get all time slots of a teacher.'
    )
    @action(detail=False, methods=['get'], url_path=r'teacher/(?P<teacher_id>[^/.]+)')
    def by_teacher(self, request, teacher_id=None):
        teacher = get_object_or_404(Teacher, pk=teacher_id)
        slots = self.queryset.filter(teacher=teacher)
        serializer = self.get_serializer(slots, many=True)
        return Response(serializer.data)

    @extend_schema(
        responses={200: TimeSlotDetailSerializer(many=True)},
        description='Get available time slots of a teacher.'
    )
    @action(detail=False, methods=['get'], url_path=r'teacher/(?P<teacher_id>[^/.]+)/available')
    def by_teacher_available(self, request, teacher_id=None):
        teacher = get_object_or_404(Teacher, pk=teacher_id)
        slots = self.queryset.filter(teacher=teacher, status=TimeSlot.AVAILABLE)
        serializer = self.get_serializer(slots, many=True)
        return Response(serializer.data)

    @extend_schema(
        responses={200: TimeSlotDetailSerializer},
        description='Mark a time slot as booked when a confirmed booking exists for it.'
    )
    @action(detail=True, methods=['post'], url_path='mark-booked')
    def mark_booked(self, request, pk=None):
        slot = get_object_or_404(TimeSlot, pk=pk)

        has_confirmed_booking = Booking.objects.filter(
            time_slot=slot,
            status=Booking.CONFIRMED,
        ).exists()

        if not has_confirmed_booking:
            return Response(
                {'detail': 'Cannot mark booked: no confirmed booking for this time slot.'},
                status=400,
            )

        if slot.status != TimeSlot.BOOKED:
            slot.status = TimeSlot.BOOKED
            slot.save(update_fields=['status'])

        serializer = TimeSlotDetailSerializer(slot)
        return Response(serializer.data)
