<?php

namespace App\Helpers;

use Illuminate\Http\JsonResponse;

class ApiResponse
{
    public static function success($data = null, string $message = 'success', int $code = 0): JsonResponse
    {
        return response()->json([
            'code' => $code,
            'message' => $message,
            'data' => $data,
        ]);
    }

    public static function error(string $message, int $code = 500, $data = null): JsonResponse
    {
        $status = match ($code) {
            400 => 400,
            401 => 401,
            403 => 403,
            404 => 404,
            default => 500,
        };

        return response()->json([
            'code' => $code,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    public static function paginated($items, int $total, int $page, int $pageSize): JsonResponse
    {
        return self::success([
            'list' => $items,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
        ]);
    }
}
