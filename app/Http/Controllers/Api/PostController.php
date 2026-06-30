<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class PostController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $page = max((int) $request->query('page', 1), 1);
        $pageSize = min(max((int) $request->query('pageSize', 10), 1), 50);
        $sort = $request->query('sort', 'latest');
        $categorySlug = $request->query('categorySlug');
        $tagSlug = $request->query('tagSlug');
        $pinned = $request->query('pinned');
        $status = $request->query('status', 'published');

        $query = Post::with(['author:id,name,avatar', 'category:id,name,slug', 'tags:id,name,slug']);

        // Non-admin users only see published posts
        $user = auth('api')->user();
        if ($user && $user->isAdmin() && $request->has('status')) {
            $query->where('status', $status);
        } else {
            $query->published();
        }

        if ($categorySlug) {
            $query->whereHas('category', function ($q) use ($categorySlug) {
                $q->where('slug', $categorySlug);
            });
        }

        if ($tagSlug) {
            $query->whereHas('tags', function ($q) use ($tagSlug) {
                $q->where('slug', $tagSlug);
            });
        }

        if ($pinned !== null) {
            $query->where('pinned', filter_var($pinned, FILTER_VALIDATE_BOOLEAN));
        }

        if ($sort === 'popular') {
            $query->orderBy('view_count', 'desc');
        } else {
            $query->orderBy('pinned', 'desc')->orderBy('published_at', 'desc');
        }

        $total = $query->count();

        $posts = $query->skip(($page - 1) * $pageSize)
            ->take($pageSize)
            ->get();

        $list = $posts->map(fn ($p) => $this->formatPostListItem($p));

        return ApiResponse::paginated($list, $total, $page, $pageSize);
    }

    public function show(string $slug): JsonResponse
    {
        $post = Post::where('slug', $slug)
            ->with(['author:id,name,avatar', 'category:id,name,slug', 'tags:id,name,slug'])
            ->first();

        if (! $post) {
            return ApiResponse::error('Post not found', 404);
        }

        if ($post->status !== 'published') {
            $user = auth('api')->user();
            if (! $user || $user->id !== $post->author_id) {
                return ApiResponse::error('Post not found', 404);
            }
        }

        $post->incrementViewCount();

        $prevPost = Post::published()
            ->where('published_at', '<', $post->published_at)
            ->orderBy('published_at', 'desc')
            ->first(['title', 'slug']);

        $nextPost = Post::published()
            ->where('published_at', '>', $post->published_at)
            ->orderBy('published_at', 'asc')
            ->first(['title', 'slug']);

        $data = $this->formatPostListItem($post);
        $data['content'] = $post->content;
        $data['prevPost'] = $prevPost ? ['title' => $prevPost->title, 'slug' => $prevPost->slug] : null;
        $data['nextPost'] = $nextPost ? ['title' => $nextPost->title, 'slug' => $nextPost->slug] : null;

        return ApiResponse::success($data);
    }

    public function store(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        if (! $user->isAuthor()) {
            return ApiResponse::error('Forbidden', 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:posts',
            'content' => 'required|string',
            'summary' => 'nullable|string',
            'cover' => 'nullable|string',
            'categoryId' => 'nullable|exists:categories,id',
            'tagIds' => 'nullable|array',
            'tagIds.*' => 'exists:tags,id',
            'status' => 'nullable|in:published,draft',
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        $status = $request->status ?? 'draft';

        $post = Post::create([
            'title' => $request->title,
            'slug' => $request->slug ?: Str::slug($request->title).'-'.Str::random(6),
            'content' => $request->content,
            'summary' => $request->summary,
            'cover' => $request->cover,
            'author_id' => $user->id,
            'category_id' => $request->categoryId,
            'status' => $status,
            'published_at' => $status === 'published' ? now() : null,
        ]);

        if ($request->tagIds) {
            $post->tags()->sync($request->tagIds);
        }

        $post->load(['author:id,name,avatar', 'category:id,name,slug', 'tags:id,name,slug']);

        return ApiResponse::success($this->formatPostListItem($post));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = auth('api')->user();
        $post = Post::find($id);

        if (! $post) {
            return ApiResponse::error('Post not found', 404);
        }

        if ($user->id !== $post->author_id && ! $user->isAdmin()) {
            return ApiResponse::error('Forbidden', 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:255|unique:posts,slug,'.$id,
            'content' => 'sometimes|string',
            'summary' => 'nullable|string',
            'cover' => 'nullable|string',
            'categoryId' => 'nullable|exists:categories,id',
            'tagIds' => 'nullable|array',
            'tagIds.*' => 'exists:tags,id',
            'status' => 'nullable|in:published,draft',
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        $data = $request->only(['title', 'slug', 'content', 'summary', 'cover', 'category_id', 'status']);

        if ($request->has('categoryId')) {
            $data['category_id'] = $request->categoryId;
            unset($data['categoryId']);
        }

        // Set published_at if transitioning from draft to published
        if ($request->status === 'published' && $post->status !== 'published') {
            $data['published_at'] = now();
        }

        $post->update($data);

        if ($request->has('tagIds')) {
            $post->tags()->sync($request->tagIds);
        }

        $post->load(['author:id,name,avatar', 'category:id,name,slug', 'tags:id,name,slug']);

        return ApiResponse::success($this->formatPostListItem($post));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = auth('api')->user();
        $post = Post::find($id);

        if (! $post) {
            return ApiResponse::error('Post not found', 404);
        }

        if ($user->id !== $post->author_id && ! $user->isAdmin()) {
            return ApiResponse::error('Forbidden', 403);
        }

        $post->delete();

        return ApiResponse::success(null, 'Post deleted');
    }

    public function drafts(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        if (! $user->isAuthor()) {
            return ApiResponse::error('Forbidden', 403);
        }

        $page = max((int) $request->query('page', 1), 1);
        $pageSize = min(max((int) $request->query('pageSize', 10), 1), 50);

        $query = Post::where('author_id', $user->id)->where('status', 'draft')
            ->with(['category:id,name,slug', 'tags:id,name,slug']);

        $total = $query->count();

        $posts = $query->orderBy('updated_at', 'desc')
            ->skip(($page - 1) * $pageSize)
            ->take($pageSize)
            ->get();

        $list = $posts->map(fn ($p) => $this->formatPostListItem($p));

        return ApiResponse::paginated($list, $total, $page, $pageSize);
    }

    public function pin(Request $request, int $id): JsonResponse
    {
        $user = auth('api')->user();

        if (! $user->isAdmin()) {
            return ApiResponse::error('Forbidden', 403);
        }

        $post = Post::find($id);

        if (! $post) {
            return ApiResponse::error('Post not found', 404);
        }

        $post->update(['pinned' => ! $post->pinned]);

        return ApiResponse::success([
            'id' => $post->id,
            'pinned' => $post->pinned,
        ]);
    }

    private function formatPostListItem(Post $post): array
    {
        return [
            'id' => $post->id,
            'title' => $post->title,
            'slug' => $post->slug,
            'summary' => $post->summary,
            'cover' => $post->cover,
            'author' => $post->author ? [
                'id' => $post->author->id,
                'username' => $post->author->name,
                'avatar' => $post->author->avatar,
            ] : null,
            'category' => $post->category ? [
                'id' => $post->category->id,
                'name' => $post->category->name,
                'slug' => $post->category->slug,
            ] : null,
            'tags' => $post->tags->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'slug' => $t->slug,
            ])->toArray(),
            'viewCount' => $post->view_count,
            'commentCount' => $post->comment_count,
            'pinned' => $post->pinned,
            'status' => $post->status,
            'publishedAt' => $post->published_at?->toIso8601String(),
            'createdAt' => $post->created_at->toIso8601String(),
        ];
    }
}
