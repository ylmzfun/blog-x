using Microsoft.EntityFrameworkCore;
using blog_csharp.Data;
using blog_csharp.DTOs;

namespace blog_csharp.Services;

public class SearchService
{
    private readonly BlogDbContext _db;

    public SearchService(BlogDbContext db) => _db = db;

    public async Task<ApiResponse<PagedData<SearchResultItem>>> SearchAsync(string q, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _db.Posts
            .Where(p => p.DeletedAt == null && p.Status == "published")
            .Where(p => EF.Functions.Like(p.Title, $"%{q}%") || EF.Functions.Like(p.Content, $"%{q}%"));

        var total = await query.CountAsync();
        var posts = await query
            .OrderByDescending(p => p.PublishedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var list = posts.Select(p =>
        {
            var highlight = GetHighlight(p.Title.Contains(q, StringComparison.OrdinalIgnoreCase) ? p.Title : p.Content, q);
            return new SearchResultItem(p.Id, p.Title, p.Slug, highlight, p.PublishedAt);
        }).ToList();

        return new ApiResponse<PagedData<SearchResultItem>>
        {
            Data = new PagedData<SearchResultItem>
            {
                List = list,
                Total = total,
                Page = page,
                PageSize = pageSize
            }
        };
    }

    public async Task<ApiResponse<SuggestionsData>> SuggestionsAsync(string q)
    {
        var titles = await _db.Posts
            .Where(p => p.DeletedAt == null && p.Status == "published")
            .Where(p => EF.Functions.Like(p.Title, $"%{q}%"))
            .OrderByDescending(p => p.PublishedAt)
            .Take(5)
            .Select(p => p.Title)
            .ToListAsync();

        return new ApiResponse<SuggestionsData>
        {
            Data = new SuggestionsData(titles)
        };
    }

    private static string GetHighlight(string text, string q)
    {
        const int contextLength = 80;
        var idx = text.IndexOf(q, StringComparison.OrdinalIgnoreCase);
        if (idx < 0) return text[..Math.Min(contextLength * 2, text.Length)];

        var start = Math.Max(0, idx - contextLength / 2);
        var end = Math.Min(text.Length, idx + q.Length + contextLength / 2);
        var snippet = text[start..end];

        snippet = snippet.Replace(
            text[idx..(idx + q.Length)],
            $"<mark>{text[idx..(idx + q.Length)]}</mark>",
            StringComparison.OrdinalIgnoreCase);

        return (start > 0 ? "..." : "") + snippet + (end < text.Length ? "..." : "");
    }
}

public record SuggestionsData(List<string> Suggestions);
