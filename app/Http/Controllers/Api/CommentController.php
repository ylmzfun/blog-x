<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Comment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CommentController extends Controller
{
    public function index(Request $request, int $postId): JsonResponse
    {
        $page = max((int) $request->query('page', 1), 1);
        $pageSize = min(max((int) $request->query('pageSize', 20), 1), 100);

        $query = Comment::where('post_id', $postId)
            ->with(['author:id,name,avatar', 'replyTo:id,name']);

        $user = auth('api')->user();
        if ($user && $user->isAdmin()) {
            // Admin sees all comments
        } else {
            $query->approved();
        }

        $total = $query->count();

        $comments = $query->orderBy('created_at', 'asc')
            ->skip(($page - 1) * $pageSize)
            ->take($pageSize)
            ->get();

        // Build tree: root comments with nested replies
        $tree = $this->buildTree($comments);

        return ApiResponse::paginated($tree, $total, $page, $pageSize);
    }

    public function store(Request $request, int $postId): JsonResponse
    {
        $user = auth('api')->user();

        $validator = Validator::make($request->all(), [
            'content' => 'required|string',
            'parentId' => 'nullable|exists:comments,id',
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        $comment = Comment::create([
            'post_id' => $postId,
            'author_id' => $user->id,
            'content' => $request->content,
            'parent_id' => $request->parentId,
            'status' => 'approved',
        ]);

        $comment->load(['author:id,name,avatar', 'replyTo:id,name']);

        return ApiResponse::success($this->formatComment($comment));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = auth('api')->user();
        $comment = Comment::find($id);

        if (! $comment) {
            return ApiResponse::error('Comment not found', 404);
        }

        if ($user->id !== $comment->author_id && ! $user->isAdmin()) {
            return ApiResponse::error('Forbidden', 403);
        }

        $comment->delete();

        return ApiResponse::success(null, 'Comment deleted');
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $user = auth('api')->user();

        if (! $user->isAdmin()) {
            return ApiResponse::error('Forbidden', 403);
        }

        $comment = Comment::find($id);

        if (! $comment) {
            return ApiResponse::error('Comment not found', 404);
        }

        $comment->update(['status' => 'approved']);

        return ApiResponse::success(null, 'Comment approved');
    }

    private function buildTree($comments): array
    {
        $rootComments = [];
        $childMap = [];

        foreach ($comments as $comment) {
            $formatted = $this->formatComment($comment);
            $formatted['replies'] = [];

            if ($comment->parent_id === null) {
                $rootComments[$comment->id] = $formatted;
            } else {
                $childMap[$comment->parent_id][] = $formatted;
            }
        }

        foreach ($childMap as $parentId => $children) {
            if (isset($rootComments[$parentId])) {
                $rootComments[$parentId]['replies'] = $children;
            }
        }

        return array_values($rootComments);
    }

    private function formatComment($comment): array
    {
        return [
            'id' => $comment->id,
            'content' => $comment->content,
            'author' => [
                'id' => $comment->author->id,
                'username' => $comment->author->name,
                'avatar' => $comment->author->avatar,
            ],
            'parentId' => $comment->parent_id,
            'replyTo' => $comment->replyTo ? [
                'id' => $comment->replyTo->id,
                'username' => $comment->replyTo->name,
            ] : null,
            'status' => $comment->status,
            'createdAt' => $comment->created_at->toIso8601String(),
        ];
    }
}
