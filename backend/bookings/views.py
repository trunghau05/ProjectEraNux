from collections import OrderedDict

from django.shortcuts import get_object_or_404
from django.db import transaction
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core.models import Booking, Session, Teacher
from core.serializers import (
    BookingDetailSerializer,
    BookingSerializer,
    TutorBookedStudentSerializer,
)


class BookingViewSet(ModelViewSet):
    """
    Booking API
    """
    queryset = Booking.objects.select_related(
        'student', 'time_slot', 'teacher'
    )
    serializer_class = BookingSerializer

    def get_serializer_class(self):
        """
        Use BookingDetailSerializer for read operations (list, retrieve)
        Use BookingSerializer for write operations (create, update, partial_update)
        """
        if self.action in ['list', 'retrieve']:
            return BookingDetailSerializer
        return BookingSerializer

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='tutor_id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Tutor ID used to retrieve students who booked this tutor.',
            )
        ],
        responses={200: TutorBookedStudentSerializer(many=True)},
        description='Get students who booked a tutor with their booked time slots.'
    )
    @action(detail=False, methods=['get'], url_path=r'tutor/(?P<tutor_id>[^/.]+)/students')
    def tutor_students(self, request, tutor_id=None):
        tutor = get_object_or_404(Teacher, pk=tutor_id, role=Teacher.TUTOR)
        bookings = (
            self.queryset.filter(teacher=tutor)
            .order_by('student__name', 'time_slot__start_at', 'id')
        )

        grouped_students = OrderedDict()

        for booking in bookings:
            if booking.student_id not in grouped_students:
                grouped_students[booking.student_id] = {
                    'student': booking.student,
                    'time_slots': [],
                }

            grouped_students[booking.student_id]['time_slots'].append({
                'booking_id': booking.id,
                'id': booking.time_slot.id,
                'start_at': booking.time_slot.start_at,
                'end_at': booking.time_slot.end_at,
                'status': booking.time_slot.status,
                'booking_status': booking.status,
            })

        serializer = TutorBookedStudentSerializer(grouped_students.values(), many=True)
        return Response(serializer.data)

    @extend_schema(
        request=None,
        responses={200: BookingDetailSerializer},
        description='Confirm a pending booking and mark its time slot as booked.'
    )
    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm_booking(self, request, pk=None):
        with transaction.atomic():
            booking = get_object_or_404(self.queryset.select_for_update(), pk=pk)

            if booking.status == Booking.CANCELLED:
                return Response({'detail': 'Cannot confirm a cancelled booking.'}, status=400)

            booking.status = Booking.CONFIRMED
            booking.save(update_fields=['status'])

            time_slot = booking.time_slot
            if time_slot.status != time_slot.BOOKED:
                time_slot.status = time_slot.BOOKED
                time_slot.save(update_fields=['status'])

            # Ensure confirming a booking always creates one tutor session.
            Session.objects.get_or_create(
                class_obj=None,
                time_slot=time_slot,
                student=booking.student,
                teacher=booking.teacher,
                defaults={
                    'start_at': time_slot.start_at,
                    'end_at': time_slot.end_at,
                    'status': Session.UPCOMING,
                }
            )

            # Keep only one confirmed winner for a slot by cancelling other pending bookings.
            Booking.objects.filter(
                time_slot=time_slot,
                status=Booking.PENDING,
            ).exclude(pk=booking.pk).update(status=Booking.CANCELLED)

        serializer = BookingDetailSerializer(booking)
        return Response(serializer.data)
