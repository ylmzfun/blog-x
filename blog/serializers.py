from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Category, Tag, Post, Comment

User = get_user_model()


# ---------- User inline ----------
class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'avatar')


class ReplyToSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username')


# ---------- Category ----------
class CategorySerializer(serializers.ModelSerializer):
    post_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'description', 'post_count')


class CategoryCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('name', 'slug', 'description')


# ---------- Tag ----------
class TagSerializer(serializers.ModelSerializer):
    post_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tag
        fields = ('id', 'name', 'slug', 'post_count')


class TagCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ('name', 'slug')


# ---------- Post ----------
class PostListSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = (
            'id', 'title', 'slug', 'summary', 'cover', 'author',
            'category', 'tags', 'view_count', 'comment_count',
            'pinned', 'status', 'published_at', 'created_at',
        )


class PostDetailSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    prev_post = serializers.SerializerMethodField()
    next_post = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = (
            'id', 'title', 'slug', 'content', 'summary', 'cover', 'author',
            'category', 'tags', 'view_count', 'comment_count',
            'pinned', 'status', 'published_at', 'created_at',
            'prev_post', 'next_post',
        )

    def get_prev_post(self, obj):
        qs = Post.objects.filter(
            status='published', created_at__lt=obj.created_at
        ).order_by('-created_at').first()
        if qs:
            return {'title': qs.title, 'slug': qs.slug}
        return None

    def get_next_post(self, obj):
        qs = Post.objects.filter(
            status='published', created_at__gt=obj.created_at
        ).order_by('created_at').first()
        if qs:
            return {'title': qs.title, 'slug': qs.slug}
        return None


class PostCreateUpdateSerializer(serializers.ModelSerializer):
    tag_ids = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )

    class Meta:
        model = Post
        fields = (
            'title', 'slug', 'content', 'summary', 'cover',
            'category', 'tag_ids', 'status',
        )
        extra_kwargs = {'category': {'required': False, 'allow_null': True}}

    def create(self, validated_data):
        tag_ids = validated_data.pop('tag_ids', [])
        post = Post.objects.create(**validated_data)
        if tag_ids:
            tags = Tag.objects.filter(id__in=tag_ids)
            post.tags.set(tags)
            for tag in tags:
                tag.post_count = tag.posts.count()
                Tag.objects.bulk_update([tag], ['post_count'])
        # Update category post_count
        if post.category:
            post.category.post_count = post.category.posts.count()
            post.category.save(update_fields=['post_count'])
        return post

    def update(self, instance, validated_data):
        tag_ids = validated_data.pop('tag_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if tag_ids is not None:
            old_category = instance.category
            tags = Tag.objects.filter(id__in=tag_ids)
            instance.tags.set(tags)

            # Recalculate tag post_counts
            all_tags = Tag.objects.filter(posts__isnull=False).distinct()
            for tag in all_tags:
                tag.post_count = tag.posts.count()
            Tag.objects.bulk_update(all_tags, ['post_count'])

            # Update category counts
            if old_category:
                old_category.post_count = old_category.posts.count()
                old_category.save(update_fields=['post_count'])

        if instance.category:
            instance.category.post_count = instance.category.posts.count()
            instance.category.save(update_fields=['post_count'])

        return instance


class PostSearchSerializer(serializers.ModelSerializer):
    highlight = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ('id', 'title', 'slug', 'highlight', 'published_at')

    def get_highlight(self, obj):
        return getattr(obj, 'highlight', obj.summary or '')


# ---------- Comment ----------
class CommentSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    reply_to = ReplyToSerializer(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = (
            'id', 'content', 'author', 'parent', 'reply_to',
            'status', 'replies', 'created_at',
        )

    def get_replies(self, obj):
        if hasattr(obj, 'prefetched_replies'):
            replies = obj.prefetched_replies
        else:
            replies = Comment.objects.filter(parent=obj, status='approved').select_related(
                'author', 'reply_to'
            ).order_by('created_at')
        return CommentSerializer(replies, many=True).data


class CommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ('content', 'parent')

    def validate_parent(self, value):
        if value:
            if value.parent is not None:
                raise serializers.ValidationError('Nested replies beyond one level are not allowed')
        return value


class CommentApproveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ('status',)


# ---------- Stats ----------
class StatsOverviewSerializer(serializers.Serializer):
    total_posts = serializers.IntegerField()
    total_comments = serializers.IntegerField()
    total_users = serializers.IntegerField()
    today_pv = serializers.IntegerField()
    today_uv = serializers.IntegerField()
