from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from core.models import Notification
from core.serializers import NotificationSerializer


class NotificationViewSet(GenericViewSet):
	queryset = Notification.objects.all()
	serializer_class = NotificationSerializer
	"""
	Notification API:
	- GET  /notifications/?role=student&user_id=1  — list notifications
	- PATCH /notifications/{id}/mark-read/         — mark one as read
	- POST  /notifications/mark-all-read/          — mark all as read
	"""

	@extend_schema(
		parameters=[
			OpenApiParameter(name='role', type=str, location=OpenApiParameter.QUERY,
							 description='Role of the user: student | teacher | tutor'),
			OpenApiParameter(name='user_id', type=int, location=OpenApiParameter.QUERY,
							 description='ID of the user'),
		],
		responses={200: NotificationSerializer(many=True)},
		description='List notifications for a user identified by role + user_id.',
	)
	def list(self, request):
		role = request.query_params.get('role', '').strip()
		user_id_str = request.query_params.get('user_id', '').strip()

		if not role or not user_id_str:
			return Response(
				{'error': 'Both role and user_id query params are required.'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		try:
			user_id = int(user_id_str)
		except ValueError:
			return Response({'error': 'user_id must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)

		qs = Notification.objects.filter(role=role)
		if role == 'student':
			qs = qs.filter(student_id=user_id)
		else:
			qs = qs.filter(teacher_id=user_id)

		serializer = NotificationSerializer(qs, many=True)
		return Response(serializer.data)

	@extend_schema(
		parameters=[
			OpenApiParameter(name='id', type=int, location=OpenApiParameter.PATH),
		],
		responses={200: NotificationSerializer},
		description='Mark a single notification as read.',
	)
	def partial_update(self, request, pk=None):
		try:
			notification = Notification.objects.get(pk=pk)
		except Notification.DoesNotExist:
			return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

		notification.is_read = True
		notification.save(update_fields=['is_read'])
		return Response(NotificationSerializer(notification).data)

	@extend_schema(
		parameters=[
			OpenApiParameter(name='role', type=str, location=OpenApiParameter.QUERY),
			OpenApiParameter(name='user_id', type=int, location=OpenApiParameter.QUERY),
		],
		responses={200: {'type': 'object', 'properties': {'updated': {'type': 'integer'}}}},
		description='Mark all notifications as read for the given role + user_id.',
	)
	@action(detail=False, methods=['post'], url_path='mark-all-read')
	def mark_all_read(self, request):
		role = request.query_params.get('role', '').strip()
		user_id_str = request.query_params.get('user_id', '').strip()

		if not role or not user_id_str:
			return Response(
				{'error': 'Both role and user_id query params are required.'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		try:
			user_id = int(user_id_str)
		except ValueError:
			return Response({'error': 'user_id must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)

		qs = Notification.objects.filter(role=role, is_read=False)
		if role == 'student':
			qs = qs.filter(student_id=user_id)
		else:
			qs = qs.filter(teacher_id=user_id)

		updated = qs.update(is_read=True)
		return Response({'updated': updated})
