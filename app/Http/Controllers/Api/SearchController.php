<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class SearchController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $q = trim($request->query('q', ''));
        $page = max((int) $request->query('page', 1), 1);
        $pageSize = min(max((int) $request->query('pageSize', 10), 1), 50);

        if (empty($q)) {
            return ApiResponse::error('Search query is required', 400);
        }

        // Use SQLite FTS5 for full-text search
        $matchExpr = $this->buildMatchExpression($q);

        $total = DB::table('posts_fts')
            ->whereRaw('posts_fts MATCH ?', [$matchExpr])
            ->count();

        $results = DB::table('posts_fts')
            ->join('posts', 'posts.id', '=', 'posts_fts.rowid')
            ->whereRaw('posts_fts MATCH ?', [$matchExpr])
            ->where('posts.status', 'published')
            ->select('posts.id', 'posts.title', 'posts.slug', 'posts.published_at', 'posts_fts.content')
            ->orderBy('posts.published_at', 'desc')
            ->skip(($page - 1) * $pageSize)
            ->take($pageSize)
            ->get();

        $list = $results->map(function ($item) use ($q) {
            return [
                'id' => $item->id,
                'title' => $item->title,
                'slug' => $item->slug,
                'highlight' => $this->generateHighlight($item->content, $q),
                'publishedAt' => $item->published_at,
            ];
        });

        return ApiResponse::paginated($list, $total, $page, $pageSize);
    }

    public function suggestions(Request $request): JsonResponse
    {
        $q = trim($request->query('q', ''));

        if (empty($q) || mb_strlen($q) < 2) {
            return ApiResponse::success(['suggestions' => []]);
        }

        $suggestions = DB::table('posts_fts')
            ->join('posts', 'posts.id', '=', 'posts_fts.rowid')
            ->whereRaw('posts_fts MATCH ?', [$this->buildMatchExpression($q).'*'])
            ->where('posts.status', 'published')
            ->select('posts.title')
            ->limit(10)
            ->pluck('title');

        return ApiResponse::success(['suggestions' => $suggestions]);
    }

    private function buildMatchExpression(string $q): string
    {
        // Escape special FTS5 characters and build a prefix match
        $terms = preg_split('/\s+/', $q);
        $terms = array_map(function ($term) {
            $escaped = str_replace('"', '""', $term);

            return '"'.$escaped.'"';
        }, $terms);

        return implode(' ', $terms);
    }

    private function generateHighlight(string $content, string $q): string
    {
        $terms = preg_split('/\s+/', $q);
        $plainText = strip_tags($content);

        // Find a snippet around the first match
        foreach ($terms as $term) {
            $pos = mb_stripos($plainText, $term);
            if ($pos !== false) {
                $start = max(0, $pos - 50);
                $snippet = mb_substr($plainText, $start, 150);

                // Highlight all matching terms
                foreach ($terms as $t) {
                    if (mb_strlen($t) > 0) {
                        $snippet = preg_replace(
                            '/('.preg_quote($t, '/').')/iu',
                            '<mark>$1</mark>',
                            $snippet
                        );
                    }
                }

                return $snippet;
            }
        }

        return mb_substr($plainText, 0, 150);
    }
}
