<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TagController extends Controller
{
    public function index(): JsonResponse
    {
        $tags = Tag::withCount('posts')->get();

        $data = $tags->map(fn ($t) => [
            'id' => $t->id,
            'name' => $t->name,
            'slug' => $t->slug,
            'postCount' => (int) $t->posts_count,
        ]);

        return ApiResponse::success($data);
    }

    public function store(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        if (! $user->isAuthor()) {
            return ApiResponse::error('Forbidden', 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:tags',
            'slug' => 'required|string|max:255|unique:tags',
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        $tag = Tag::create([
            'name' => $request->name,
            'slug' => $request->slug,
        ]);

        return ApiResponse::success([
            'id' => $tag->id,
            'name' => $tag->name,
            'slug' => $tag->slug,
            'postCount' => 0,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = auth('api')->user();

        if (! $user->isAdmin()) {
            return ApiResponse::error('Forbidden', 403);
        }

        $tag = Tag::find($id);

        if (! $tag) {
            return ApiResponse::error('Tag not found', 404);
        }

        $tag->delete();

        return ApiResponse::success(null, 'Tag deleted');
    }
}
