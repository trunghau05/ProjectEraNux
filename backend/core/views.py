from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from core.serializers import LoginSerializer

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


