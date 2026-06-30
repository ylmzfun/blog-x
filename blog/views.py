import os
import uuid
from datetime import date

import bleach
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Count, Q, F, Value, CharField
from django.db.models.functions import Concat
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Tag, Post, Comment
from .permissions import IsAdmin, IsOwnerOrAdmin, IsAdminOrAuthor
from .serializers import (
    CategorySerializer, CategoryCreateUpdateSerializer,
    TagSerializer, TagCreateSerializer,
    PostListSerializer, PostDetailSerializer, PostCreateUpdateSerializer,
    PostSearchSerializer,
    CommentSerializer, CommentCreateSerializer,
    StatsOverviewSerializer,
)
from .pagination import StandardPagination

User = get_user_model()


def _make_response(code=0, message='success', data=None, http_status=200):
    body = {'code': code, 'message': message}
    if data is not None:
        body['data'] = data
    return Response(body, status=http_status)


def _paginated_response(serializer_class, queryset, request, context=None):
    paginator = StandardPagination()
    page = paginator.paginate_queryset(queryset, request)
    if page is not None:
        serializer = serializer_class(page, many=True, context=context or {})
        result = paginator.get_paginated_response(serializer.data)
        return _make_response(data=result)
    serializer = serializer_class(queryset, many=True, context=context or {})
    return _make_response(data={
        'list': serializer.data,
        'total': queryset.count(),
        'page': 1,
        'pageSize': StandardPagination.page_size,
    })


def _clean_html(html_text):
    allowed_tags = list(bleach.ALLOWED_TAGS) + [
        'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'pre', 'code', 'blockquote', 'img', 'table', 'thead',
        'tbody', 'tr', 'th', 'td', 'hr', 'br', 'span', 'div',
        'del', 'ins', 'sup', 'sub', 'details', 'summary',
    ]
    allowed_attrs = {
        **bleach.ALLOWED_ATTRIBUTES,
        'a': ['href', 'title', 'target'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        'code': ['class'],
        'pre': ['class'],
    }
    allowed_attrs['*'] = allowed_attrs.get('*', []) + ['id', 'class']
    return bleach.clean(html_text, tags=allowed_tags, attributes=allowed_attrs)


# ==================== Post Views ====================

class PostListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Post.objects.filter(deleted_at__isnull=True, status='published')

        category_slug = request.query_params.get('categorySlug')
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)

        tag_slug = request.query_params.get('tagSlug')
        if tag_slug:
            queryset = queryset.filter(tags__slug=tag_slug)

        sort = request.query_params.get('sort', 'latest')
        if sort == 'popular':
            queryset = queryset.order_by('-view_count', '-created_at')
        else:
            queryset = queryset.order_by('-pinned', '-created_at')

        status_filter = request.query_params.get('status')
        if status_filter and request.user.is_authenticated and request.user.role == 'admin':
            queryset = Post.objects.filter(deleted_at__isnull=True, status=status_filter)

        pinned = request.query_params.get('pinned')
        if pinned == 'true':
            queryset = queryset.filter(pinned=True)

        return _paginated_response(
            PostListSerializer,
            queryset.select_related('author', 'category').prefetch_related('tags'),
            request,
        )

    def post(self, request):
        if not request.user.is_authenticated:
            return _make_response(401, 'Authentication required', http_status=401)

        serializer = PostCreateUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return _make_response(400, str(serializer.errors), http_status=400)

        post = serializer.save(author=request.user)
        post.content = _clean_html(post.content)
        if post.status == 'published':
            post.published_at = timezone.now()
        post.save(update_fields=['content', 'published_at'])

        return _make_response(data=PostDetailSerializer(post).data)


class PostDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            post = Post.objects.select_related('author', 'category').prefetch_related(
                'tags'
            ).get(slug=slug, deleted_at__isnull=True)
        except Post.DoesNotExist:
            return _make_response(404, 'Post not found', http_status=404)

        if post.status == 'published':
            post.view_count = F('view_count') + 1
            post.save(update_fields=['view_count'])
            post.refresh_from_db()

        return _make_response(data=PostDetailSerializer(post).data)


class PostDetailByIdView(APIView):
    permission_classes = [IsAdminOrAuthor]

    def get_object(self, post_id):
        try:
            return Post.objects.get(id=post_id, deleted_at__isnull=True)
        except Post.DoesNotExist:
            return None

    def put(self, request, post_id):
        post = self.get_object(post_id)
        if not post:
            return _make_response(404, 'Post not found', http_status=404)
        self.check_object_permissions(request, post)

        serializer = PostCreateUpdateSerializer(post, data=request.data, partial=True)
        if not serializer.is_valid():
            return _make_response(400, str(serializer.errors), http_status=400)

        post = serializer.save()
        post.content = _clean_html(post.content)
        post.save(update_fields=['content'])

        if post.category:
            post.category.post_count = post.category.posts.filter(
                status='published', deleted_at__isnull=True
            ).count()
            post.category.save(update_fields=['post_count'])

        return _make_response(data=PostDetailSerializer(post).data)

    def delete(self, request, post_id):
        post = self.get_object(post_id)
        if not post:
            return _make_response(404, 'Post not found', http_status=404)
        self.check_object_permissions(request, post)

        post.deleted_at = timezone.now()
        post.save(update_fields=['deleted_at'])
        return _make_response()


class PostDraftListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = Post.objects.filter(
            author=request.user, status='draft', deleted_at__isnull=True
        )
        return _paginated_response(
            PostListSerializer,
            queryset.select_related('author', 'category').prefetch_related('tags'),
            request,
        )


class PostPinView(APIView):
    permission_classes = [IsAdmin]

    def put(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id, deleted_at__isnull=True)
        except Post.DoesNotExist:
            return _make_response(404, 'Post not found', http_status=404)

        post.pinned = not post.pinned
        post.save(update_fields=['pinned'])
        return _make_response(data={'pinned': post.pinned})


# ==================== Category Views ====================

class CategoryListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        categories = Category.objects.all()
        serializer = CategorySerializer(categories, many=True)
        return _make_response(data=serializer.data)

    def post(self, request):
        if not request.user.is_authenticated or request.user.role != 'admin':
            return _make_response(403, 'Permission denied', http_status=403)

        serializer = CategoryCreateUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return _make_response(400, str(serializer.errors), http_status=400)
        category = serializer.save()
        return _make_response(data=CategorySerializer(category).data)


class CategoryDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            category = Category.objects.get(slug=slug)
        except Category.DoesNotExist:
            return _make_response(404, 'Category not found', http_status=404)
        return _make_response(data=CategorySerializer(category).data)


class CategoryManageView(APIView):
    permission_classes = [IsAdmin]

    def get_object(self, category_id):
        try:
            return Category.objects.get(id=category_id)
        except Category.DoesNotExist:
            return None

    def put(self, request, category_id):
        category = self.get_object(category_id)
        if not category:
            return _make_response(404, 'Category not found', http_status=404)
        serializer = CategoryCreateUpdateSerializer(
            category, data=request.data, partial=True
        )
        if not serializer.is_valid():
            return _make_response(400, str(serializer.errors), http_status=400)
        category = serializer.save()
        return _make_response(data=CategorySerializer(category).data)

    def delete(self, request, category_id):
        category = self.get_object(category_id)
        if not category:
            return _make_response(404, 'Category not found', http_status=404)
        category.delete()
        return _make_response()


# ==================== Tag Views ====================

class TagListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        tags = Tag.objects.all()
        serializer = TagSerializer(tags, many=True)
        return _make_response(data=serializer.data)

    def post(self, request):
        if not request.user.is_authenticated:
            return _make_response(401, 'Authentication required', http_status=401)

        serializer = TagCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return _make_response(400, str(serializer.errors), http_status=400)
        tag = serializer.save()
        return _make_response(data=TagSerializer(tag).data)


class TagDeleteView(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, tag_id):
        try:
            tag = Tag.objects.get(id=tag_id)
        except Tag.DoesNotExist:
            return _make_response(404, 'Tag not found', http_status=404)
        tag.delete()
        return _make_response()


# ==================== Comment Views ====================

class CommentListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, post_id):
        comments = Comment.objects.filter(
            post_id=post_id,
            parent__isnull=True,
            status='approved',
            deleted_at__isnull=True,
        ).select_related('author', 'reply_to').prefetch_related(
            'replies__author', 'replies__reply_to'
        ).order_by('created_at')

        paginator = StandardPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(comments, request)
        if page is not None:
            serializer = CommentSerializer(page, many=True)
            result = paginator.get_paginated_response(serializer.data)
            return _make_response(data=result)

        serializer = CommentSerializer(comments, many=True)
        return _make_response(data={
            'list': serializer.data,
            'total': comments.count(),
            'page': 1,
            'pageSize': 20,
        })

    def post(self, request, post_id):
        if not request.user.is_authenticated:
            return _make_response(401, 'Authentication required', http_status=401)

        try:
            post = Post.objects.get(id=post_id, deleted_at__isnull=True)
        except Post.DoesNotExist:
            return _make_response(404, 'Post not found', http_status=404)

        serializer = CommentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return _make_response(400, str(serializer.errors), http_status=400)

        comment = serializer.save(post=post, author=request.user, status='approved')

        parent = comment.parent
        if parent:
            comment.reply_to = parent.author
            comment.save(update_fields=['reply_to'])

        post.comment_count = Comment.objects.filter(
            post=post, status='approved', deleted_at__isnull=True
        ).count()
        post.save(update_fields=['comment_count'])

        return _make_response(data=CommentSerializer(comment).data)


class CommentManageView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    def get_object(self, comment_id):
        try:
            return Comment.objects.get(id=comment_id, deleted_at__isnull=True)
        except Comment.DoesNotExist:
            return None

    def delete(self, request, comment_id):
        comment = self.get_object(comment_id)
        if not comment:
            return _make_response(404, 'Comment not found', http_status=404)
        self.check_object_permissions(request, comment)

        comment.deleted_at = timezone.now()
        comment.save(update_fields=['deleted_at'])

        post = comment.post
        post.comment_count = Comment.objects.filter(
            post=post, status='approved', deleted_at__isnull=True
        ).count()
        post.save(update_fields=['comment_count'])

        return _make_response()


class CommentApproveView(APIView):
    permission_classes = [IsAdmin]

    def put(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return _make_response(404, 'Comment not found', http_status=404)

        comment.status = 'approved' if comment.status != 'approved' else 'pending'
        comment.save(update_fields=['status'])

        post = comment.post
        post.comment_count = Comment.objects.filter(
            post=post, status='approved', deleted_at__isnull=True
        ).count()
        post.save(update_fields=['comment_count'])

        return _make_response(data={'status': comment.status})


# ==================== Search Views ====================

class SearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return _make_response(400, 'Query parameter q is required', http_status=400)

        queryset = Post.objects.filter(
            deleted_at__isnull=True, status='published'
        ).filter(
            Q(title__icontains=q) | Q(content__icontains=q)
        ).order_by('-created_at')

        def add_mark(post, q_lower=q.lower()):
            if post.summary:
                highlighted = post.summary
            else:
                content = post.content or ''
                idx = content.lower().find(q_lower)
                if idx >= 0:
                    start = max(0, idx - 40)
                    end = min(len(content), idx + len(q) + 40)
                    highlighted = content[start:end]
                else:
                    highlighted = content[:80]
            # Case-insensitive highlighting
            import re
            pattern = re.compile(re.escape(q), re.IGNORECASE)
            post.highlight = pattern.sub(lambda m: f'<mark>{m.group(0)}</mark>', highlighted)
            return post

        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            items = [add_mark(p) for p in page]
            serializer = PostSearchSerializer(items, many=True)
            result = paginator.get_paginated_response(serializer.data)
            return _make_response(data=result)

        items = [add_mark(p) for p in queryset]
        serializer = PostSearchSerializer(items, many=True)
        return _make_response(data={
            'list': serializer.data,
            'total': queryset.count(),
            'page': 1,
            'pageSize': 10,
        })


class SearchSuggestionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return _make_response(data={'suggestions': []})

        titles = Post.objects.filter(
            deleted_at__isnull=True, status='published', title__icontains=q
        ).values_list('title', flat=True)[:8]

        return _make_response(data={'suggestions': list(titles)})


# ==================== Stats Views ====================

class StatsOverviewView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        data = {
            'totalPosts': Post.objects.filter(
                deleted_at__isnull=True, status='published'
            ).count(),
            'totalComments': Comment.objects.filter(
                deleted_at__isnull=True
            ).count(),
            'totalUsers': User.objects.count(),
            'todayPV': 0,
            'todayUV': 0,
        }
        return _make_response(data=data)


class TopPostsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        posts = Post.objects.filter(
            deleted_at__isnull=True, status='published'
        ).order_by('-view_count')[:10]
        return _make_response(data=PostListSerializer(posts, many=True).data)


# ==================== Upload Views ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_image(request):
    file = request.FILES.get('file')
    if not file:
        return _make_response(400, 'No file provided', http_status=400)

    allowed_ext = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg')
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in allowed_ext:
        return _make_response(
            400, f'Unsupported file type: {ext}', http_status=400
        )

    today = date.today()
    upload_dir = os.path.join(
        settings.MEDIA_ROOT, 'uploads',
        str(today.year), f'{today.month:02d}', f'{today.day:02d}',
    )
    os.makedirs(upload_dir, exist_ok=True)

    filename = f'{uuid.uuid4().hex}{ext}'
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, 'wb') as f:
        for chunk in file.chunks():
            f.write(chunk)

    url = (
        f'{settings.MEDIA_URL}uploads/{today.year}/'
        f'{today.month:02d}/{today.day:02d}/{filename}'
    )
    return _make_response(data={'url': url, 'filename': filename})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_avatar(request):
    file = request.FILES.get('file')
    if not file:
        return _make_response(400, 'No file provided', http_status=400)

    allowed_ext = ('.jpg', '.jpeg', '.png', '.gif', '.webp')
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in allowed_ext:
        return _make_response(
            400, f'Unsupported file type: {ext}', http_status=400
        )

    avatar_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
    os.makedirs(avatar_dir, exist_ok=True)

    filename = f'{request.user.id}_{uuid.uuid4().hex}{ext}'
    filepath = os.path.join(avatar_dir, filename)
    with open(filepath, 'wb') as f:
        for chunk in file.chunks():
            f.write(chunk)

    url = f'{settings.MEDIA_URL}avatars/{filename}'
    return _make_response(data={'url': url, 'filename': filename})
