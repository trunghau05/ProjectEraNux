import importlib
import os
from django.conf import settings
from django.utils import timezone
from drf_spectacular.utils import extend_schema

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSet

from core.models import Room
from core.serializers import (
    LoginSerializer,
    UploadRecordingRequestSerializer,
    UploadRecordingResponseSerializer,
)

class AuthViewSet(ViewSet):
    """
    Authentication API with detailed notifications
    """
    serializer_class = LoginSerializer
    authentication_classes = []
    permission_classes = []

    def create(self, request):
        """
        Login endpoint with detailed error messages
        Returns:
            - 200: Login successful
            - 400: Invalid login information
            - 401: Incorrect password or email not found
        """
        serializer = self.serializer_class(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
            response_data = serializer.validated_data
            return Response(
                response_data,
                status=status.HTTP_200_OK
            )
        except ValidationError as e:
            # Handle validation errors with appropriate status codes
            error_detail = e.detail
            
            # Check if it's a password error or email error
            if isinstance(error_detail, dict):
                if 'password' in error_detail:
                    return Response(
                        {
                            'error': error_detail.get('password'),
                            'message': 'Incorrect password. Please try again.',
                            'success': False
                        },
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                elif 'email' in error_detail:
                    return Response(
                        {
                            'error': error_detail.get('email'),
                            'message': 'Email not found. Please check again.',
                            'success': False
                        },
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Generic validation error
            return Response(
                {
                    'error': str(error_detail),
                    'message': 'Invalid login information',
                    'success': False
                },
                status=status.HTTP_400_BAD_REQUEST
            )


class UploadRecordingView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    authentication_classes = []
    permission_classes = []
    serializer_class = UploadRecordingRequestSerializer

    @extend_schema(
        request=UploadRecordingRequestSerializer,
        responses={
            201: UploadRecordingResponseSerializer,
            400: UploadRecordingResponseSerializer,
            500: UploadRecordingResponseSerializer,
        },
    )
    def post(self, request):
        video_file = request.FILES.get('file')
        room_id = request.data.get('roomId', 'unknown-room')
        user_id = request.data.get('userId', 'anonymous')

        if not video_file:
            return Response(
                {
                    'success': False,
                    'message': 'Thiếu file video upload'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        cloud_name = getattr(settings, 'CLOUDINARY_CLOUD_NAME', None) or os.getenv('CLOUDINARY_CLOUD_NAME')
        api_key = getattr(settings, 'CLOUDINARY_API_KEY', None) or os.getenv('CLOUDINARY_API_KEY')
        api_secret = getattr(settings, 'CLOUDINARY_API_SECRET', None) or os.getenv('CLOUDINARY_API_SECRET')

        if not cloud_name or not api_key or not api_secret:
            return Response(
                {
                    'success': False,
                    'message': 'Cloudinary chưa cấu hình. Hãy set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        try:
            cloudinary = importlib.import_module('cloudinary')
            cloudinary_uploader = importlib.import_module('cloudinary.uploader')
        except ImportError:
            return Response(
                {
                    'success': False,
                    'message': 'Thiếu thư viện cloudinary. Cài bằng: pip install cloudinary'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True,
        )

        public_id = f"video-call/{room_id}/{user_id}-{video_file.name.rsplit('.', 1)[0]}"

        try:
            result = cloudinary_uploader.upload_large(
                video_file,
                resource_type='video',
                folder='eranux-recordings',
                public_id=public_id,
                overwrite=False,
            )

            secure_url = result.get('secure_url')
            uploaded_public_id = result.get('public_id')

            session_id = None
            if room_id:
                room = Room.objects.select_related('session').filter(room_code=room_id).first()
                if room and room.session:
                    room.session.recording_url = secure_url
                    room.session.recording_public_id = uploaded_public_id
                    room.session.recording_uploaded_at = timezone.now()
                    room.session.save(update_fields=['recording_url', 'recording_public_id', 'recording_uploaded_at'])
                    session_id = room.session.id

            return Response(
                {
                    'success': True,
                    'message': 'Upload video thành công',
                    'secure_url': secure_url,
                    'public_id': uploaded_public_id,
                    'session_id': session_id,
                    'duration': result.get('duration'),
                    'bytes': result.get('bytes'),
                    'format': result.get('format'),
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as exc:
            return Response(
                {
                    'success': False,
                    'message': f'Upload video thất bại: {str(exc)}'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


