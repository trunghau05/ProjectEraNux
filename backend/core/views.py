from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework import status
from core.serializers import LoginSerializer

class AuthViewSet(ViewSet):
    """
    Authentication API
    """
    serializer_class = LoginSerializer
    authentication_classes = []
    permission_classes = []

    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


