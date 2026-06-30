from django.urls import path
from . import views_auth

urlpatterns = [
    path('register', views_auth.register, name='auth_register'),
    path('login', views_auth.login, name='auth_login'),
    path('logout', views_auth.logout, name='auth_logout'),
    path('refresh', views_auth.refresh_token, name='auth_refresh'),
    path('forgot-password', views_auth.forgot_password, name='auth_forgot_password'),
    path('reset-password', views_auth.reset_password, name='auth_reset_password'),
]
