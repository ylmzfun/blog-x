from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .serializers import (
    RegisterSerializer, LoginSerializer, RefreshSerializer,
    ForgotPasswordSerializer, ResetPasswordSerializer,
)

User = get_user_model()


def _make_response(code=0, message='success', data=None, http_status=200):
    body = {'code': code, 'message': message}
    if data is not None:
        body['data'] = data
    return Response(body, status=http_status)


def _get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'accessToken': str(refresh.access_token),
        'refreshToken': str(refresh),
        'expiresIn': 7200,
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return _make_response(400, 'Validation error', http_status=400)
    user = serializer.save()
    return _make_response(data={
        'id': str(user.id), 'username': user.username, 'email': user.email
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return _make_response(400, 'Invalid input', http_status=400)

    email = serializer.validated_data['email']
    password = serializer.validated_data['password']

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return _make_response(401, 'Invalid email or password', http_status=401)

    if not user.check_password(password):
        return _make_response(401, 'Invalid email or password', http_status=401)

    tokens = _get_tokens_for_user(user)
    return _make_response(data={
        **tokens,
        'user': {
            'id': str(user.id),
            'username': user.username,
            'avatar': user.avatar,
            'role': user.role,
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get('refreshToken')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except TokenError:
        pass
    return _make_response()


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    serializer = RefreshSerializer(data=request.data)
    if not serializer.is_valid():
        return _make_response(400, 'Invalid input', http_status=400)

    try:
        token = RefreshToken(serializer.validated_data['refreshToken'])
        return _make_response(data={
            'accessToken': str(token.access_token),
            'expiresIn': 7200,
        })
    except TokenError:
        return _make_response(401, 'Invalid refresh token', http_status=401)


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    serializer = ForgotPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return _make_response(400, 'Invalid input', http_status=400)
    # In production, send email with reset link. Here we return a dummy token.
    return _make_response(message='Password reset email sent (mock)')


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    serializer = ResetPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return _make_response(400, 'Invalid input', http_status=400)
    # In production, verify token and reset. Mock here.
    return _make_response(message='Password has been reset (mock)')
