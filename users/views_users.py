from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .serializers import (
    UserProfileSerializer, UserUpdateSerializer, UserPublicSerializer,
    ChangePasswordSerializer,
)

User = get_user_model()


def _make_response(code=0, message='success', data=None, http_status=200):
    body = {'code': code, 'message': message}
    if data is not None:
        body['data'] = data
    return Response(body, status=http_status)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def me_handler(request):
    if request.method == 'GET':
        serializer = UserProfileSerializer(request.user)
        data = serializer.data
        data['id'] = str(data['id'])
        return _make_response(data=data)

    # PUT
    serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
    if not serializer.is_valid():
        return _make_response(400, str(serializer.errors), http_status=400)
    serializer.save()
    profile_serializer = UserProfileSerializer(request.user)
    data = profile_serializer.data
    data['id'] = str(data['id'])
    return _make_response(data=data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return _make_response(400, str(serializer.errors), http_status=400)

    user = request.user
    if not user.check_password(serializer.validated_data['oldPassword']):
        return _make_response(400, 'Old password is incorrect', http_status=400)

    user.set_password(serializer.validated_data['newPassword'])
    user.save()
    return _make_response()


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_public(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return _make_response(404, 'User not found', http_status=404)
    serializer = UserPublicSerializer(user)
    data = serializer.data
    data['id'] = str(data['id'])
    return _make_response(data=data)
