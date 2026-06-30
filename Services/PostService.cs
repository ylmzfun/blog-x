using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using blog_csharp.Data;
using blog_csharp.DTOs;
using blog_csharp.Models;

namespace blog_csharp.Services;

public class PostService
{
    private readonly BlogDbContext _db;

    public PostService(BlogDbContext db) => _db = db;

    public async Task<ApiResponse<PagedData<PostListItem>>> GetListAsync(
        int page, int pageSize, string? categorySlug, string? tagSlug,
        string? status, string? sort, bool? pinned)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _db.Posts
            .Include(p => p.Author)
            .Include(p => p.Category)
            .Include(p => p.PostTags).ThenInclude(pt => pt.Tag)
            .Where(p => p.DeletedAt == null && p.Status == "published")
            .AsQueryable();

        if (!string.IsNullOrEmpty(categorySlug))
            query = query.Where(p => p.Category != null && p.Category.Slug == categorySlug);

        if (!string.IsNullOrEmpty(tagSlug))
            query = query.Where(p => p.PostTags.Any(pt => pt.Tag != null && pt.Tag.Slug == tagSlug));

        if (pinned == true)
            query = query.Where(p => p.Pinned);

        query = sort switch
        {
            "popular" => query.OrderByDescending(p => p.ViewCount),
            _ => query.OrderByDescending(p => p.Pinned).ThenByDescending(p => p.PublishedAt)
        };

        var total = await query.CountAsync();
        var posts = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new ApiResponse<PagedData<PostListItem>>
        {
            Data = new PagedData<PostListItem>
            {
                List = posts.Select(MapToListItem).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            }
        };
    }

    public async Task<ApiResponse<PostDetail>> GetBySlugAsync(string slug)
    {
        var post = await _db.Posts
            .Include(p => p.Author)
            .Include(p => p.Category)
            .Include(p => p.PostTags).ThenInclude(pt => pt.Tag)
            .FirstOrDefaultAsync(p => p.Slug == slug && p.DeletedAt == null);

        if (post == null)
            return new ApiResponse<PostDetail> { Code = 404, Message = "Post not found" };

        post.ViewCount++;
        await _db.SaveChangesAsync();

        var prevPost = await _db.Posts
            .Where(p => p.DeletedAt == null && p.Status == "published" && p.PublishedAt < post.PublishedAt)
            .OrderByDescending(p => p.PublishedAt)
            .Select(p => new PostNav(p.Title, p.Slug))
            .FirstOrDefaultAsync();

        var nextPost = await _db.Posts
            .Where(p => p.DeletedAt == null && p.Status == "published" && p.PublishedAt > post.PublishedAt)
            .OrderBy(p => p.PublishedAt)
            .Select(p => new PostNav(p.Title, p.Slug))
            .FirstOrDefaultAsync();

        var detail = new PostDetail(
            post.Id, post.Title, post.Slug, post.Content, post.Summary,
            post.Cover,
            post.Author != null ? new UserBrief(post.Author.Id, post.Author.Username, post.Author.Avatar, post.Author.Role) : null,
            post.Category != null ? new CategoryBrief(post.Category.Id, post.Category.Name, post.Category.Slug) : null,
            post.PostTags.Where(pt => pt.Tag != null).Select(pt => new TagBrief(pt.Tag!.Id, pt.Tag.Name, pt.Tag.Slug)).ToList(),
            post.ViewCount, post.CommentCount, post.Pinned, post.Status,
            post.PublishedAt, post.CreatedAt,
            prevPost, nextPost
        );

        return new ApiResponse<PostDetail> { Data = detail };
    }

    public async Task<ApiResponse<PostListItem>> CreateAsync(CreatePostRequest req, string userId)
    {
        var slug = !string.IsNullOrEmpty(req.Slug)
            ? req.Slug
            : GenerateSlug(req.Title);

        if (await _db.Posts.AnyAsync(p => p.Slug == slug))
            return new ApiResponse<PostListItem> { Code = 400, Message = "Slug already exists" };

        var post = new Post
        {
            Title = req.Title,
            Slug = slug,
            Content = req.Content,
            Summary = req.Summary,
            Cover = req.Cover,
            CategoryId = req.CategoryId,
            AuthorId = userId,
            Status = req.Status ?? "published",
            PublishedAt = req.Status == "draft" ? null : DateTime.UtcNow
        };

        if (req.TagIds?.Count > 0)
        {
            foreach (var tagId in req.TagIds)
                post.PostTags.Add(new PostTag { PostId = post.Id, TagId = tagId });
        }

        _db.Posts.Add(post);

        if (post.Status == "published" && post.CategoryId != null)
        {
            var cat = await _db.Categories.FindAsync(post.CategoryId);
            if (cat != null) cat.PostCount++;
        }

        await _db.SaveChangesAsync();

        var saved = await _db.Posts
            .Include(p => p.Author)
            .Include(p => p.Category)
            .Include(p => p.PostTags).ThenInclude(pt => pt.Tag)
            .FirstOrDefaultAsync(p => p.Id == post.Id);

        return new ApiResponse<PostListItem> { Data = MapToListItem(saved!) };
    }

    public async Task<ApiResponse<PostListItem>> UpdateAsync(string id, UpdatePostRequest req, string userId, string role)
    {
        var post = await _db.Posts
            .Include(p => p.PostTags)
            .FirstOrDefaultAsync(p => p.Id == id && p.DeletedAt == null);

        if (post == null)
            return new ApiResponse<PostListItem> { Code = 404, Message = "Post not found" };

        if (post.AuthorId != userId && role != "admin")
            return new ApiResponse<PostListItem> { Code = 403, Message = "Forbidden" };

        if (req.Title != null) post.Title = req.Title;
        if (req.Slug != null) post.Slug = req.Slug;
        if (req.Content != null) post.Content = req.Content;
        if (req.Summary != null) post.Summary = req.Summary;
        if (req.Cover != null) post.Cover = req.Cover;

        if (req.CategoryId != null && req.CategoryId != post.CategoryId)
        {
            if (post.CategoryId != null && post.Status == "published")
            {
                var oldCat = await _db.Categories.FindAsync(post.CategoryId);
                if (oldCat != null) oldCat.PostCount = Math.Max(0, oldCat.PostCount - 1);
            }
            post.CategoryId = req.CategoryId;
            if (post.Status == "published")
            {
                var newCat = await _db.Categories.FindAsync(req.CategoryId);
                if (newCat != null) newCat.PostCount++;
            }
        }

        if (req.TagIds != null)
        {
            foreach (var pt in post.PostTags.ToList())
                _db.PostTags.Remove(pt);
            foreach (var tagId in req.TagIds)
                post.PostTags.Add(new PostTag { PostId = post.Id, TagId = tagId });
        }

        if (req.Status != null && req.Status != post.Status)
        {
            var wasPublished = post.Status == "published";
            post.Status = req.Status;
            if (req.Status == "published" && !wasPublished)
            {
                post.PublishedAt = DateTime.UtcNow;
                if (post.CategoryId != null)
                {
                    var cat = await _db.Categories.FindAsync(post.CategoryId);
                    if (cat != null) cat.PostCount++;
                }
            }
            else if (req.Status == "draft" && wasPublished)
            {
                if (post.CategoryId != null)
                {
                    var cat = await _db.Categories.FindAsync(post.CategoryId);
                    if (cat != null) cat.PostCount = Math.Max(0, cat.PostCount - 1);
                }
                post.PublishedAt = null;
            }
        }

        post.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var updated = await _db.Posts
            .Include(p => p.Author)
            .Include(p => p.Category)
            .Include(p => p.PostTags).ThenInclude(pt => pt.Tag)
            .FirstOrDefaultAsync(p => p.Id == id);

        return new ApiResponse<PostListItem> { Data = MapToListItem(updated!) };
    }

    public async Task<ApiResponse<object>> DeleteAsync(string id, string userId, string role)
    {
        var post = await _db.Posts
            .Include(p => p.PostTags)
            .FirstOrDefaultAsync(p => p.Id == id && p.DeletedAt == null);

        if (post == null)
            return new ApiResponse<object> { Code = 404, Message = "Post not found" };

        if (post.AuthorId != userId && role != "admin")
            return new ApiResponse<object> { Code = 403, Message = "Forbidden" };

        post.DeletedAt = DateTime.UtcNow;
        if (post.Status == "published" && post.CategoryId != null)
        {
            var cat = await _db.Categories.FindAsync(post.CategoryId);
            if (cat != null) cat.PostCount = Math.Max(0, cat.PostCount - 1);
        }

        await _db.SaveChangesAsync();
        return new ApiResponse<object> { Message = "Deleted" };
    }

    public async Task<ApiResponse<PagedData<PostListItem>>> GetDraftsAsync(string userId, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _db.Posts
            .Include(p => p.Author)
            .Include(p => p.Category)
            .Include(p => p.PostTags).ThenInclude(pt => pt.Tag)
            .Where(p => p.DeletedAt == null && p.Status == "draft" && p.AuthorId == userId);

        var total = await query.CountAsync();
        var posts = await query.OrderByDescending(p => p.UpdatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new ApiResponse<PagedData<PostListItem>>
        {
            Data = new PagedData<PostListItem>
            {
                List = posts.Select(MapToListItem).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            }
        };
    }

    public async Task<ApiResponse<PostListItem>> TogglePinAsync(string id)
    {
        var post = await _db.Posts
            .Include(p => p.Author)
            .Include(p => p.Category)
            .Include(p => p.PostTags).ThenInclude(pt => pt.Tag)
            .FirstOrDefaultAsync(p => p.Id == id && p.DeletedAt == null);

        if (post == null)
            return new ApiResponse<PostListItem> { Code = 404, Message = "Post not found" };

        post.Pinned = !post.Pinned;
        await _db.SaveChangesAsync();

        return new ApiResponse<PostListItem> { Data = MapToListItem(post) };
    }

    private static PostListItem MapToListItem(Post p) => new(
        p.Id, p.Title, p.Slug, p.Summary, p.Cover,
        p.Author != null ? new UserBrief(p.Author.Id, p.Author.Username, p.Author.Avatar, p.Author.Role) : null,
        p.Category != null ? new CategoryBrief(p.Category.Id, p.Category.Name, p.Category.Slug) : null,
        p.PostTags.Where(pt => pt.Tag != null).Select(pt => new TagBrief(pt.Tag!.Id, pt.Tag.Name, pt.Tag.Slug)).ToList(),
        p.ViewCount, p.CommentCount, p.Pinned, p.Status,
        p.PublishedAt, p.CreatedAt
    );

    private static string GenerateSlug(string title)
    {
        var slug = title.ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");
        slug = slug.Trim('-');
        return slug;
    }
}
