from django.urls import path
from . import views

urlpatterns = [
    # Posts
    path('posts', views.PostListView.as_view(), name='post_list'),
    path('posts/drafts', views.PostDraftListView.as_view(), name='post_drafts'),
    path('posts/<slug:slug>', views.PostDetailView.as_view(), name='post_detail'),
    path('posts/<int:post_id>/pin', views.PostPinView.as_view(), name='post_pin'),
    path('posts/id/<int:post_id>', views.PostDetailByIdView.as_view(), name='post_by_id'),

    # Categories
    path('categories', views.CategoryListView.as_view(), name='category_list'),
    path('categories/<slug:slug>', views.CategoryDetailView.as_view(), name='category_detail'),
    path('categories/<int:category_id>/manage', views.CategoryManageView.as_view(), name='category_manage'),

    # Tags
    path('tags', views.TagListView.as_view(), name='tag_list'),
    path('tags/<int:tag_id>', views.TagDeleteView.as_view(), name='tag_delete'),

    # Comments
    path('posts/<int:post_id>/comments', views.CommentListView.as_view(), name='comment_list'),
    path('comments/<int:comment_id>/manage', views.CommentManageView.as_view(), name='comment_manage'),
    path('comments/<int:comment_id>/approve', views.CommentApproveView.as_view(), name='comment_approve'),

    # Search
    path('search', views.SearchView.as_view(), name='search'),
    path('search/suggestions', views.SearchSuggestionsView.as_view(), name='search_suggestions'),

    # Stats
    path('stats/overview', views.StatsOverviewView.as_view(), name='stats_overview'),
    path('stats/posts/top', views.TopPostsView.as_view(), name='stats_top_posts'),

    # Upload
    path('upload/image', views.upload_image, name='upload_image'),
    path('upload/avatar', views.upload_avatar, name='upload_avatar'),
]
