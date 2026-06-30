<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UploadController extends Controller
{
    public function image(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|image|max:5120',
        ]);

        $path = $request->file('file')->store('images', 'public');
        $url = Storage::disk('public')->url($path);

        return ApiResponse::success([
            'url' => $url,
            'filename' => basename($path),
        ]);
    }

    public function avatar(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|image|max:2048',
        ]);

        $user = auth('api')->user();
        $path = $request->file('file')->store('avatars', 'public');
        $url = Storage::disk('public')->url($path);

        $user->update(['avatar' => $url]);

        return ApiResponse::success([
            'url' => $url,
            'filename' => basename($path),
        ]);
    }
}
