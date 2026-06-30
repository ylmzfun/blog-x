using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace blog_csharp.Models;

public class Comment
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string PostId { get; set; } = string.Empty;

    [ForeignKey(nameof(PostId))]
    public Post? Post { get; set; }

    [Required]
    public string AuthorId { get; set; } = string.Empty;

    [ForeignKey(nameof(AuthorId))]
    public User? Author { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;

    public string? ParentId { get; set; }

    [ForeignKey(nameof(ParentId))]
    public Comment? Parent { get; set; }

    public string? ReplyToUserId { get; set; }

    [ForeignKey(nameof(ReplyToUserId))]
    public User? ReplyToUser { get; set; }

    [Required, MaxLength(20)]
    public string Status { get; set; } = "approved";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? DeletedAt { get; set; }

    public ICollection<Comment> Replies { get; set; } = new List<Comment>();
}
