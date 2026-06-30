namespace blog_csharp.DTOs;

// ============ Auth ============

public record RegisterRequest(string Username, string Email, string Password);

public record LoginRequest(string Email, string Password);

public record RefreshRequest(string RefreshToken);

public record AuthResponse(string AccessToken, string RefreshToken, int ExpiresIn, UserBrief User);

public record TokenResponse(string AccessToken, int ExpiresIn);

// ============ User ============

public record UserBrief(string Id, string Username, string? Avatar, string? Role);

public record UserProfile(
    string Id,
    string Username,
    string Email,
    string? Avatar,
    string? Bio,
    string? Website,
    string Role,
    DateTime CreatedAt
);

public record UpdateProfileRequest(string? Username, string? Avatar, string? Bio, string? Website);

public record ChangePasswordRequest(string OldPassword, string NewPassword);

// ============ Post ============

public record CreatePostRequest(
    string Title,
    string? Slug,
    string Content,
    string? Summary,
    string? Cover,
    string? CategoryId,
    List<string>? TagIds,
    string? Status
);

public record UpdatePostRequest(
    string? Title,
    string? Slug,
    string? Content,
    string? Summary,
    string? Cover,
    string? CategoryId,
    List<string>? TagIds,
    string? Status
);

public record PostListItem(
    string Id,
    string Title,
    string Slug,
    string? Summary,
    string? Cover,
    UserBrief? Author,
    CategoryBrief? Category,
    List<TagBrief> Tags,
    int ViewCount,
    int CommentCount,
    bool Pinned,
    string Status,
    DateTime? PublishedAt,
    DateTime CreatedAt
);

public record PostDetail(
    string Id,
    string Title,
    string Slug,
    string Content,
    string? Summary,
    string? Cover,
    UserBrief? Author,
    CategoryBrief? Category,
    List<TagBrief> Tags,
    int ViewCount,
    int CommentCount,
    bool Pinned,
    string Status,
    DateTime? PublishedAt,
    DateTime CreatedAt,
    PostNav? PrevPost,
    PostNav? NextPost
);

public record PostNav(string Title, string Slug);

// ============ Category ============

public record CategoryBrief(string Id, string Name, string Slug);

public record CategoryItem(string Id, string Name, string Slug, string? Description, int PostCount);

public record CreateCategoryRequest(string Name, string Slug, string? Description);

public record UpdateCategoryRequest(string? Name, string? Slug, string? Description);

// ============ Tag ============

public record TagBrief(string Id, string Name, string Slug);

public record TagItem(string Id, string Name, string Slug, int PostCount);

public record CreateTagRequest(string Name, string Slug);

// ============ Comment ============

public record CommentItem(
    string Id,
    string Content,
    UserBrief? Author,
    string? ParentId,
    UserBrief? ReplyTo,
    string Status,
    List<CommentItem> Replies,
    DateTime CreatedAt
);

public record CreateCommentRequest(string Content, string? ParentId);

// ============ Search ============

public record SearchResultItem(
    string Id,
    string Title,
    string Slug,
    string Highlight,
    DateTime? PublishedAt
);

// ============ Stats ============

public record StatsOverview(
    int TotalPosts,
    int TotalComments,
    int TotalUsers,
    int TodayPV,
    int TodayUV
);

public record TopPost(string Id, string Title, string Slug, int ViewCount);

// ============ Upload ============

public record UploadResponse(string Url, string Filename);

// ============ Common ============

public class ApiResponse<T>
{
    public int Code { get; set; }
    public string Message { get; set; } = "success";
    public T? Data { get; set; }
}

public class PagedData<T>
{
    public List<T> List { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
