using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace blog_csharp.Models;

public class Post
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(250)]
    public string Slug { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Summary { get; set; }

    [MaxLength(500)]
    public string? Cover { get; set; }

    [Required]
    public string AuthorId { get; set; } = string.Empty;

    [ForeignKey(nameof(AuthorId))]
    public User? Author { get; set; }

    public string? CategoryId { get; set; }

    [ForeignKey(nameof(CategoryId))]
    public Category? Category { get; set; }

    [Required, MaxLength(20)]
    public string Status { get; set; } = "published";

    public bool Pinned { get; set; } = false;

    public int ViewCount { get; set; } = 0;

    public int CommentCount { get; set; } = 0;

    public DateTime? PublishedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? DeletedAt { get; set; }

    public ICollection<PostTag> PostTags { get; set; } = new List<PostTag>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
}
