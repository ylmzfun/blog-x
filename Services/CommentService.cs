using Microsoft.EntityFrameworkCore;
using blog_csharp.Data;
using blog_csharp.DTOs;
using blog_csharp.Models;

namespace blog_csharp.Services;

public class CommentService
{
    private readonly BlogDbContext _db;

    public CommentService(BlogDbContext db) => _db = db;

    public async Task<ApiResponse<PagedData<CommentItem>>> GetByPostAsync(string postId, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var topLevel = await _db.Comments
            .Include(c => c.Author)
            .Include(c => c.ReplyToUser)
            .Include(c => c.Replies).ThenInclude(r => r.Author)
            .Include(c => c.Replies).ThenInclude(r => r.ReplyToUser)
            .Where(c => c.PostId == postId && c.ParentId == null && c.DeletedAt == null && c.Status == "approved")
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var total = topLevel.Count;
        var paged = topLevel.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return new ApiResponse<PagedData<CommentItem>>
        {
            Data = new PagedData<CommentItem>
            {
                List = paged.Select(MapToItem).ToList(),
                Total = total,
                Page = page,
                PageSize = pageSize
            }
        };
    }

    public async Task<ApiResponse<CommentItem>> CreateAsync(string postId, CreateCommentRequest req, string userId)
    {
        var post = await _db.Posts.FirstOrDefaultAsync(p => p.Id == postId && p.DeletedAt == null);
        if (post == null)
            return new ApiResponse<CommentItem> { Code = 404, Message = "Post not found" };

        var comment = new Comment
        {
            PostId = postId,
            AuthorId = userId,
            Content = req.Content,
            ParentId = req.ParentId,
            Status = "approved"
        };

        if (req.ParentId != null)
        {
            var parent = await _db.Comments.FindAsync(req.ParentId);
            if (parent != null)
                comment.ReplyToUserId = parent.AuthorId;
        }

        _db.Comments.Add(comment);
        post.CommentCount++;
        await _db.SaveChangesAsync();

        var saved = await _db.Comments
            .Include(c => c.Author)
            .Include(c => c.ReplyToUser)
            .FirstOrDefaultAsync(c => c.Id == comment.Id);

        return new ApiResponse<CommentItem> { Data = MapSingleItem(saved!) };
    }

    public async Task<ApiResponse<object>> DeleteAsync(string id, string userId, string role)
    {
        var comment = await _db.Comments
            .Include(c => c.Post)
            .FirstOrDefaultAsync(c => c.Id == id && c.DeletedAt == null);

        if (comment == null)
            return new ApiResponse<object> { Code = 404, Message = "Comment not found" };

        if (comment.AuthorId != userId && role != "admin")
            return new ApiResponse<object> { Code = 403, Message = "Forbidden" };

        comment.DeletedAt = DateTime.UtcNow;
        if (comment.Post != null)
            comment.Post.CommentCount = Math.Max(0, comment.Post.CommentCount - 1);

        await _db.SaveChangesAsync();
        return new ApiResponse<object> { Message = "Deleted" };
    }

    public async Task<ApiResponse<CommentItem>> ApproveAsync(string id)
    {
        var comment = await _db.Comments
            .Include(c => c.Author)
            .Include(c => c.ReplyToUser)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (comment == null)
            return new ApiResponse<CommentItem> { Code = 404, Message = "Comment not found" };

        comment.Status = "approved";
        await _db.SaveChangesAsync();

        return new ApiResponse<CommentItem> { Data = MapSingleItem(comment) };
    }

    private static CommentItem MapToItem(Comment c) => new(
        c.Id, c.Content,
        c.Author != null ? new UserBrief(c.Author.Id, c.Author.Username, c.Author.Avatar, c.Author.Role) : null,
        c.ParentId,
        c.ReplyToUser != null ? new UserBrief(c.ReplyToUser.Id, c.ReplyToUser.Username, null, null) : null,
        c.Status,
        c.Replies.Select(MapToItem).ToList(),
        c.CreatedAt
    );

    private static CommentItem MapSingleItem(Comment c) => new(
        c.Id, c.Content,
        c.Author != null ? new UserBrief(c.Author.Id, c.Author.Username, c.Author.Avatar, c.Author.Role) : null,
        c.ParentId,
        c.ReplyToUser != null ? new UserBrief(c.ReplyToUser.Id, c.ReplyToUser.Username, null, null) : null,
        c.Status,
        new List<CommentItem>(),
        c.CreatedAt
    );
}
