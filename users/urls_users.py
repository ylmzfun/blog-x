from django.urls import path
from . import views_users

urlpatterns = [
    path('me', views_users.me_handler, name='user_me'),
    path('me/password', views_users.change_password, name='user_change_password'),
    path('<int:user_id>', views_users.get_user_public, name='user_public'),
]
