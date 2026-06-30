<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    public function overview(): JsonResponse
    {
        $user = auth('api')->user();

        if (! $user->isAdmin()) {
            return ApiResponse::error('Forbidden', 403);
        }

        $totalPosts = Post::where('status', 'published')->count();
        $totalComments = Comment::count();
        $totalUsers = User::count();

        $today = today()->toDateString();

        $todayPV = DB::table('sessions')
            ->whereDate('created_at', $today)
            ->count();

        $todayUV = DB::table('sessions')
            ->whereDate('created_at', $today)
            ->distinct('user_id')
            ->count('user_id');

        return ApiResponse::success([
            'totalPosts' => $totalPosts,
            'totalComments' => $totalComments,
            'totalUsers' => $totalUsers,
            'todayPV' => $todayPV,
            'todayUV' => $todayUV,
        ]);
    }

    public function topPosts(): JsonResponse
    {
        $user = auth('api')->user();

        if (! $user->isAdmin()) {
            return ApiResponse::error('Forbidden', 403);
        }

        $posts = Post::published()
            ->orderBy('view_count', 'desc')
            ->limit(10)
            ->get(['id', 'title', 'slug', 'view_count']);

        $list = $posts->map(fn ($p) => [
            'id' => $p->id,
            'title' => $p->title,
            'slug' => $p->slug,
            'viewCount' => $p->view_count,
        ]);

        return ApiResponse::success($list);
    }
}
