from rest_framework.permissions import BasePermission


class IsAdminOrAuthor(BasePermission):
    """Allow admin (full access) or author (own content only)."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        # Check if obj has 'author' attribute
        author = getattr(obj, 'author', None)
        if author and author == request.user:
            return True
        return False


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsAdminOrAuthorReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user and request.user.is_authenticated


class IsOwnerOrAdmin(BasePermission):
    """Owner or admin can modify; anyone authenticated can create."""

    def has_permission(self, request, view):
        if request.method == 'POST':
            return request.user and request.user.is_authenticated
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        if request.user.role == 'admin':
            return True
        return obj.author == request.user
