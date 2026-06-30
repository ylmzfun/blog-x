using System.ComponentModel.DataAnnotations;

namespace blog_csharp.Models;

public class Tag
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(120)]
    public string Slug { get; set; } = string.Empty;

    public int PostCount { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<PostTag> PostTags { get; set; } = new List<PostTag>();
}
